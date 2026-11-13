"""
Research-style evaluation of the TerraAlert v3 landslide model.

Produces everything a paper's "Evaluation" section needs, for three models side by side:
    v2            the original model, exactly as deployed (CHIRPS rain, plains rule)
    v3 original   v3 before tuning (200 trees, depth 6)
    v3 tuned      the installed v3 (best_params_v3.json)

Outputs (ai-module/v3/evaluation_report/):
    figures/*.png              ROC, precision-recall, confusion matrices, threshold curves, calibration,
                               score distributions, feature importance, partial dependence, learning curves,
                               per-fold scores, per-region / per-season results
    tables/*.csv               metrics with 95% confidence intervals, per fold, per group
    metrics.json               every number in machine-readable form
    EVALUATION_REPORT_v3.pdf   all of the above, written up like a paper section

Evaluation protocol (why the numbers are honest):
    * Every v3 score is OUT-OF-FOLD: 5-fold spatial cross-validation where each fold holds out whole
      ~100 km blocks, so a row is always scored by a model that never saw its area.
    * 95% confidence intervals use a CLUSTER bootstrap: we resample the 27 spatial blocks (not single rows),
      because rows in one block are not independent (same storms, same terrain).
    * Note: the tuned settings were chosen on all rows, so these out-of-fold figures are slightly optimistic.
      The strictly honest headline (nested CV) is in tune_results_v3.json and is reported next to them.

Run:  py -3.11 ai-module/v3/research_evaluation_v3.py        (~3-5 min)
"""
import json
import os
import sys
from datetime import datetime

import joblib
import matplotlib

matplotlib.use('Agg')  # draw to files, no window (works on servers and in scripts)
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix, log_loss,  # noqa: E402
                             matthews_corrcoef, precision_recall_curve, roc_auc_score, roc_curve)
from sklearn.model_selection import StratifiedGroupKFold  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

from v3_common import (FEATURES, HERE, ROOT, feature_matrix, load_best, load_dataset,  # noqa: E402
                       plains_mask, v3_inputs, v3_model)

# ============================================================================== settings
OUT = os.path.join(HERE, 'evaluation_report')          # everything is written here
FIG, TAB = os.path.join(OUT, 'figures'), os.path.join(OUT, 'tables')
SEED = 0                                               # same fold split as calibrate_thresholds_v3.py
N_BOOT = 1000                                          # bootstrap repeats for confidence intervals
V2_MODEL = os.path.join(ROOT, 'ai-module', 'xgboost_model_v2.pkl')
V2_SCALER = os.path.join(ROOT, 'ai-module', 'scaler_v2.pkl')
OLD_APP_ALERT = 0.40   # before Nov 2026 the app alerted at score >= 40, i.e. raw output >= 0.40 (v2 and old v3)

# One fixed colour per model, used the same way in every figure (validated categorical slots 1-3)
COLORS = {'v3 tuned': '#2a78d6', 'v3 original': '#eb6834', 'v2': '#1baf7a'}
INK, INK_2, GRID, SURFACE = '#0b0b0b', '#52514e', '#e6e5e0', '#fcfcfb'
# Metrics get their own colours (+ line styles), so blue/orange always mean "model" and nothing else
METRIC_STYLE = {'recall': ('#e87ba4', '-'), 'precision': ('#008300', '--'), 'false_alarm_rate': ('#6250d6', '-.')}
# Row types are drawn in greys with different dashes (identity by line style, colour stays free)
KIND_STYLE = {'landslide': (INK, '-'), 'spatial_control': (INK_2, '--'), 'temporal_control': ('#9e9d97', ':')}
KIND_NAMES = {'landslide': 'Landslide', 'spatial_control': 'Nearby slope, same day',
              'temporal_control': 'Same place, normal year'}

plt.rcParams.update({                                   # one quiet style for every figure
    'figure.facecolor': SURFACE, 'axes.facecolor': SURFACE, 'savefig.facecolor': SURFACE,
    'axes.edgecolor': INK_2, 'axes.labelcolor': INK, 'xtick.color': INK_2, 'ytick.color': INK_2,
    'text.color': INK, 'font.size': 9, 'axes.titlesize': 10, 'axes.titleweight': 'bold',
    'axes.spines.top': False, 'axes.spines.right': False, 'axes.grid': True, 'grid.color': GRID,
    'grid.linewidth': 0.6, 'lines.linewidth': 2, 'legend.frameon': False, 'figure.dpi': 110,
})


def save(fig, name):
    """Save a figure as PNG (200 dpi = sharp in print) and close it to free memory."""
    path = os.path.join(FIG, name)
    fig.tight_layout()
    fig.savefig(path, dpi=200)
    plt.close(fig)
    return path


# ============================================================================== scores
def out_of_fold(X, y, groups, best):
    """Score every row with a model trained on the other 4 folds (other areas). best=None -> original v3."""
    p = np.zeros(len(y))
    folds = list(StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED).split(X, y, groups))
    for tr, te in folds:
        scaler = StandardScaler().fit(v3_inputs(X.iloc[tr], best))          # learn scaling on training part
        model = v3_model(y[tr], best).fit(scaler.transform(v3_inputs(X.iloc[tr], best)), y[tr])
        p[te] = model.predict_proba(scaler.transform(X.iloc[te]))[:, 1]     # score the held-out areas
    return p, folds


def v2_scores(X2):
    """v2 exactly as deployed: its own scaler and model, then the plains rule. (v2 never saw the controls,
    but it WAS trained on these same landslide events, so if anything its scores are flattered.)"""
    model, scaler = joblib.load(V2_MODEL), joblib.load(V2_SCALER)
    p = model.predict_proba(scaler.transform(X2[list(scaler.feature_names_in_)]))[:, 1]
    p[plains_mask(X2).to_numpy()] = 0.05
    return p


def cutoff_for_recall(y, p, recall=0.70):
    """Highest cut-off that still flags `recall` of the landslides (same rule as the app's MODERATE level)."""
    s = np.sort(p[y == 1])[::-1]
    return float(s[int(np.ceil(recall * len(s))) - 1])


# ============================================================================== metrics
def metrics_at(y, p, cut):
    """All standard classification metrics when we alert for every score >= cut."""
    pred = (p >= cut).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    recall = tp / (tp + fn)                          # landslides caught (sensitivity)
    precision = tp / max(tp + fp, 1)                 # alerts that were real (positive predictive value)
    specificity = tn / (tn + fp)                     # safe rows correctly left alone
    return {
        'cutoff': cut, 'tp': int(tp), 'fp': int(fp), 'tn': int(tn), 'fn': int(fn),
        'recall': recall, 'precision': precision, 'specificity': specificity,
        'false_alarm_rate': fp / (fp + tn),          # = 1 - specificity
        'npv': tn / max(tn + fn, 1),                 # "LOW" answers that were truly safe
        'accuracy': (tp + tn) / len(y),
        'balanced_accuracy': (recall + specificity) / 2,   # fair under class imbalance
        'f1': 2 * precision * recall / max(precision + recall, 1e-9),
        'f2': 5 * precision * recall / max(4 * precision + recall, 1e-9),  # weighs recall 2x (warning apps)
        'mcc': matthews_corrcoef(y, pred),           # one balanced number from the whole confusion matrix
    }


def ranking_metrics(y, p):
    """Threshold-free metrics: how well scores rank, and how close they are to probabilities."""
    return {
        'roc_auc': roc_auc_score(y, p),              # P(random landslide scores above random safe row)
        'pr_auc': average_precision_score(y, p),     # area under precision-recall; baseline = prevalence
        'brier': brier_score_loss(y, p),             # mean squared error of the score as a probability
        'log_loss': log_loss(y, np.clip(p, 1e-6, 1 - 1e-6)),
    }


def cluster_bootstrap(y, groups, scores, fn, n=N_BOOT, seed=42):
    """95% interval for fn(y, p) by resampling whole spatial blocks with replacement.
    scores may be one array or a tuple of arrays (for paired comparisons)."""
    rng = np.random.default_rng(seed)
    blocks = pd.Series(np.arange(len(y))).groupby(groups).apply(np.array).to_list()   # row indexes per block
    out = []
    for _ in range(n):
        idx = np.concatenate([blocks[i] for i in rng.integers(0, len(blocks), len(blocks))])
        if y[idx].min() == y[idx].max():
            continue                                  # a sample with one class has no AUC - skip it
        args = tuple(s[idx] for s in scores) if isinstance(scores, tuple) else (scores[idx],)
        out.append(fn(y[idx], *args))
    return float(np.percentile(out, 2.5)), float(np.percentile(out, 97.5))


# ============================================================================== figures
def fig_roc(y, P):
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    for name, p in P.items():
        fpr, tpr, _ = roc_curve(y, p)
        ax.plot(fpr, tpr, color=COLORS[name], label=f'{name}  (AUC {roc_auc_score(y, p):.3f})')
    ax.plot([0, 1], [0, 1], ls='--', lw=1, color=INK_2, label='Random guess (0.500)')
    ax.set(xlabel='False alarm rate (1 - specificity)', ylabel='Landslides caught (recall)',
           title='ROC curve, unseen areas', xlim=(0, 1), ylim=(0, 1))
    ax.legend(loc='lower right', fontsize=8)
    return save(fig, '01_roc_curve.png')


def fig_pr(y, P):
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    for name, p in P.items():
        prec, rec, _ = precision_recall_curve(y, p)
        ax.plot(rec, prec, color=COLORS[name], label=f'{name}  (AP {average_precision_score(y, p):.3f})')
    ax.axhline(y.mean(), ls='--', lw=1, color=INK_2, label=f'Random guess ({y.mean():.3f})')
    ax.set(xlabel='Landslides caught (recall)', ylabel='Alerts that were real (precision)',
           title='Precision-recall curve, unseen areas', xlim=(0, 1), ylim=(0, 1))
    ax.legend(loc='upper right', fontsize=8)
    return save(fig, '02_precision_recall_curve.png')


def fig_confusion(y, panels):
    """panels: list of (title, p, cut). Counts plus share of each true class."""
    fig, axes = plt.subplots(1, len(panels), figsize=(3.3 * len(panels), 3.3))
    for ax, (title, p, cut) in zip(np.atleast_1d(axes), panels):
        cm = confusion_matrix(y, (p >= cut).astype(int), labels=[0, 1])
        share = cm / cm.sum(axis=1, keepdims=True)                     # row % = per true class
        ax.imshow(share, cmap='Blues', vmin=0, vmax=1)
        for i in range(2):
            for j in range(2):
                ax.text(j, i, f'{cm[i, j]}\n({share[i, j]:.0%})', ha='center', va='center', fontsize=9,
                        color='white' if share[i, j] > 0.55 else INK)
        ax.set(xticks=[0, 1], yticks=[0, 1], xticklabels=['No alert', 'Alert'],
               yticklabels=['Safe', 'Landslide'], xlabel='Model said', ylabel='Truth')
        ax.set_title(f'{title}\ncut-off {cut:.2f}', fontsize=9)
        ax.grid(False)
    return save(fig, '03_confusion_matrices.png')


def fig_thresholds(y, p, cuts):
    grid = np.linspace(0.01, 0.99, 197)
    rows = [metrics_at(y, p, c) for c in grid]
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    series = [('recall', 'Landslides caught (recall)'), ('precision', 'Alerts that were real (precision)'),
              ('false_alarm_rate', 'Safe places wrongly alerted')]
    enough = np.array([r['tp'] + r['fp'] >= 20 for r in rows])          # precision is noise with < 20 alerts
    for key, label in series:
        color, ls = METRIC_STYLE[key]
        vals = np.array([r[key] for r in rows], dtype=float)
        if key == 'precision':
            vals[~enough] = np.nan
        ax.plot(grid, vals, color=color, ls=ls, label=label)
    for i, (level, c) in enumerate(cuts.items()):                       # the app's level boundaries
        ax.axvline(c, color=INK_2, lw=1, ls=':')
        ax.text(c, 1.02 + 0.06 * (i % 2), level.title(), ha='center', va='bottom', fontsize=7.5, color=INK_2)
    ax.set(xlabel='Cut-off on the model output', ylabel='Share', ylim=(0, 1.14), xlim=(0.25, 0.75),
           title='What each cut-off would do (v3 tuned)')
    ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.18), ncol=3, fontsize=8)   # below the plot, off the lines
    return save(fig, '04_threshold_tradeoff.png')


def fig_calibration(y, P, bins=10):
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    for name, p in P.items():
        edges = np.unique(np.quantile(p, np.linspace(0, 1, bins + 1)))       # equal-count bins
        idx = np.clip(np.digitize(p, edges[1:-1]), 0, len(edges) - 2)
        mean_p = [p[idx == b].mean() for b in range(len(edges) - 1)]
        frac = [y[idx == b].mean() for b in range(len(edges) - 1)]
        ax.plot(mean_p, frac, marker='o', ms=4, color=COLORS[name], label=f'{name} (Brier {brier_score_loss(y, p):.3f})')
    ax.plot([0, 1], [0, 1], ls='--', lw=1, color=INK_2, label='Perfectly calibrated')
    ax.set(xlabel='Model output (mean in bin)', ylabel='Share that were landslides',
           title='Calibration (reliability) diagram', xlim=(0, 1), ylim=(0, 1))
    ax.legend(loc='upper left', fontsize=7.5)
    return save(fig, '05_calibration.png')


def fig_score_distribution(df, p, cut):
    fig, ax = plt.subplots(figsize=(6.4, 3.6))
    bins = np.linspace(0, 1, 41)
    for kind, (color, ls) in KIND_STYLE.items():
        ax.hist(p[df.kind == kind], bins=bins, histtype='step', lw=2, color=color, ls=ls, label=KIND_NAMES[kind],
                density=True)
    ax.axvline(cut, color=INK_2, lw=1, ls=':')
    ax.text(cut, ax.get_ylim()[1] * 0.97, ' alert level (MODERATE)', fontsize=7.5, color=INK_2, va='top')
    ax.set(xlabel='Model output (v3 tuned, out-of-fold)', ylabel='Density',
           title='Score distribution by row type')
    ax.legend(fontsize=8)
    return save(fig, '06_score_distribution.png')


def fig_roc_by_comparison(df, y, p):
    fig, ax = plt.subplots(figsize=(4.6, 4.2))
    for kind, ls in [('temporal_control', '-'), ('spatial_control', '--')]:
        m = ((df.kind == 'landslide') | (df.kind == kind)).to_numpy()
        fpr, tpr, _ = roc_curve(y[m], p[m])
        ax.plot(fpr, tpr, color=COLORS['v3 tuned'], ls=ls, label=f'vs {KIND_NAMES[kind].lower()} (AUC {roc_auc_score(y[m], p[m]):.3f})')
    ax.plot([0, 1], [0, 1], ls='--', lw=1, color=INK_2, label='Random guess')
    ax.set(xlabel='False alarm rate', ylabel='Landslides caught', title='ROC by comparison (v3 tuned)',
           xlim=(0, 1), ylim=(0, 1))
    ax.legend(loc='lower right', fontsize=7.5)
    return save(fig, '07_roc_by_comparison.png')


def permutation_importance(X, y, folds, best, repeats=5, seed=1):
    """How much unseen-area ROC-AUC drops when one input is shuffled (its information destroyed).
    Done on held-out folds, so it measures what the model USES TO PREDICT, not what it memorised."""
    rng = np.random.default_rng(seed)
    drops = {f: [] for f in FEATURES}
    for tr, te in folds:
        scaler = StandardScaler().fit(v3_inputs(X.iloc[tr], best))
        model = v3_model(y[tr], best).fit(scaler.transform(v3_inputs(X.iloc[tr], best)), y[tr])
        X_te = X.iloc[te].reset_index(drop=True)
        base = roc_auc_score(y[te], model.predict_proba(scaler.transform(X_te))[:, 1])
        for f in FEATURES:
            for _ in range(repeats):
                shuffled = X_te.copy()
                shuffled[f] = rng.permutation(shuffled[f].to_numpy())
                drops[f].append(base - roc_auc_score(y[te], model.predict_proba(scaler.transform(shuffled))[:, 1]))
    return pd.DataFrame({'mean_auc_drop': {f: np.mean(v) for f, v in drops.items()},
                         'sd': {f: np.std(v) for f, v in drops.items()}}).sort_values('mean_auc_drop')


def fig_importance(imp):
    fig, ax = plt.subplots(figsize=(6.4, 5.2))
    ax.barh(imp.index, imp.mean_auc_drop, xerr=imp.sd, color=COLORS['v3 tuned'], height=0.6,
            error_kw={'ecolor': INK_2, 'lw': 1})
    ax.axvline(0, color=INK_2, lw=1)
    ax.set(xlabel='Drop in unseen-area ROC-AUC when the input is shuffled', title='Permutation feature importance (v3 tuned)')
    ax.grid(axis='y', visible=False)
    return save(fig, '08_feature_importance.png')


def fig_partial_dependence(X, model, scaler, best):
    """Average model output as one input changes and everything else stays as in the data."""
    fig, axes = plt.subplots(1, 3, figsize=(9.6, 3.2))
    for ax, f, label in zip(axes, ['rainfall_3d', 'rainfall_30d', 'slope'],
                            ['3-day rainfall (mm)', '30-day rainfall (mm)', 'Slope (degrees)']):
        grid = np.linspace(X[f].quantile(0.01), X[f].quantile(0.99), 30)
        mean_out = []
        for v in grid:
            Xv = X.copy()
            Xv[f] = v
            mean_out.append(model.predict_proba(scaler.transform(Xv))[:, 1].mean())
        ax.plot(grid, mean_out, color=COLORS['v3 tuned'])
        ax.set(xlabel=label, ylabel='Average model output' if f == 'rainfall_3d' else '', title=label)
    return save(fig, '09_partial_dependence.png')


def learning_curve(X, y, folds, best, fractions=(0.2, 0.4, 0.6, 0.8, 1.0), seed=3):
    """Training vs unseen-area AUC as the model gets more training rows. A big, persistent gap = overfitting."""
    rng = np.random.default_rng(seed)
    rows = []
    for frac in fractions:
        for tr, te in folds:
            sub = rng.choice(tr, int(len(tr) * frac), replace=False)
            scaler = StandardScaler().fit(v3_inputs(X.iloc[sub], best))
            model = v3_model(y[sub], best).fit(scaler.transform(v3_inputs(X.iloc[sub], best)), y[sub])
            rows.append({'fraction': frac, 'n_train': len(sub),
                         'train_auc': roc_auc_score(y[sub], model.predict_proba(scaler.transform(X.iloc[sub]))[:, 1]),
                         'unseen_auc': roc_auc_score(y[te], model.predict_proba(scaler.transform(X.iloc[te]))[:, 1])})
    return pd.DataFrame(rows).groupby('fraction').agg(['mean', 'std'])


def fig_learning(curves):
    fig, axes = plt.subplots(1, 2, figsize=(9.0, 3.6), sharey=True)
    for ax, (name, lc) in zip(axes, curves.items()):
        n = lc[('n_train', 'mean')]
        color = COLORS['v3 tuned'] if 'tuned' in name else COLORS['v3 original']
        for key, label, ls in [('train_auc', 'On its training rows', '--'), ('unseen_auc', 'On unseen areas', '-')]:
            ax.plot(n, lc[(key, 'mean')], marker='o', ms=4, color=color, ls=ls, label=label)
            ax.fill_between(n, lc[(key, 'mean')] - lc[(key, 'std')], lc[(key, 'mean')] + lc[(key, 'std')],
                            color=color, alpha=0.15, lw=0)
        ax.set(title=name, xlabel='Training rows', ylim=(0.45, 1.02))
        ax.legend(fontsize=8, loc='center right')
    axes[0].set_ylabel('ROC-AUC')
    return save(fig, '10_learning_curves.png')


def fig_per_fold(per_fold):
    fig, ax = plt.subplots(figsize=(6.4, 3.0))
    for name in ['v3 original', 'v3 tuned']:
        d = per_fold[per_fold.model == name]
        ax.plot(d.fold, d.roc_auc, marker='o', ms=7, lw=1, color=COLORS[name], label=name)
    ax.axhline(0.5, ls='--', lw=1, color=INK_2)
    ax.set(xlabel='Fold (held-out group of areas)', ylabel='ROC-AUC', title='ROC-AUC per fold',
           xticks=sorted(per_fold.fold.unique()))
    ax.legend(fontsize=8)
    return save(fig, '11_per_fold_auc.png')


def fig_groups(groups_df):
    d = groups_df[groups_df.rows >= 50]                        # groups too small to judge are left out
    fig, ax = plt.subplots(figsize=(6.4, 3.4))
    pos = np.arange(len(d))
    ax.barh(pos + 0.2, d.recall, height=0.38, color=METRIC_STYLE['recall'][0], label='Landslides caught')
    ax.barh(pos - 0.2, d.false_alarm_rate, height=0.38, color=METRIC_STYLE['false_alarm_rate'][0],
            label='Safe places wrongly alerted')
    for i, (r, fa) in enumerate(zip(d.recall, d.false_alarm_rate)):
        ax.text(r + 0.01, i + 0.2, f'{r:.0%}', va='center', fontsize=7.5, color=INK)
        ax.text(fa + 0.01, i - 0.2, f'{fa:.0%}', va='center', fontsize=7.5, color=INK)
    ax.set(yticks=pos, yticklabels=d.group, xlim=(0, 1), xlabel='Share at the alert level (v3 tuned)',
           title='Results by region and season')
    ax.grid(axis='y', visible=False)
    ax.legend(fontsize=8, loc='lower right')
    return save(fig, '12_by_region_season.png')


# ============================================================================== PDF write-up
def write_pdf(r, figs):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    ss = getSampleStyleSheet()
    H1 = ParagraphStyle('H1', parent=ss['Title'], fontSize=18, textColor=colors.HexColor('#1F4E79'), alignment=0)
    H2 = ParagraphStyle('H2', parent=ss['Heading2'], fontSize=12.5, textColor=colors.HexColor('#1F4E79'))
    B = ParagraphStyle('B', parent=ss['Normal'], fontSize=9.4, leading=13)
    CAP = ParagraphStyle('CAP', parent=B, fontSize=8.4, leading=11.5, textColor=colors.HexColor('#52514e'))
    C = ParagraphStyle('C', parent=B, fontSize=8.2, leading=10.5)
    CH = ParagraphStyle('CH', parent=C, fontName='Helvetica-Bold', textColor=colors.white)

    def table(rows, widths):
        t = Table([[Paragraph(str(c), CH if i == 0 else C) for c in row] for i, row in enumerate(rows)],
                  colWidths=[w * mm for w in widths], repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
                               ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#EAF1F8')]),
                               ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#B7C7D9')),
                               ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
        return t

    def figure(key, caption, width=170):
        path = figs[key]
        from reportlab.lib.utils import ImageReader
        w, h = ImageReader(path).getSize()
        return KeepTogether([Image(path, width=width * mm, height=width * mm * h / w), Spacer(1, 2),
                             Paragraph(caption, CAP), Spacer(1, 8)])

    m = r['models']
    ci = lambda name, k: f"{m[name]['ranking'][k]:.3f} [{m[name]['ci'][k][0]:.3f}, {m[name]['ci'][k][1]:.3f}]"
    pct = lambda name, op, k: f"{m[name][op][k]:.0%}"
    s = [Paragraph('TerraAlert v3: Model Evaluation Report', H1),
         Paragraph(f"Generated {r['generated_at'][:10]} by ai-module/v3/research_evaluation_v3.py", CAP), Spacer(1, 8)]

    s += [Paragraph('Abstract', H2), Paragraph(
        f"We evaluate an XGBoost model that rates landslide risk from rainfall, terrain, vegetation and soil inputs. "
        f"On {r['data']['rows']:,} rows ({r['data']['landslides']} landslides) from Himachal Pradesh, Uttarakhand and "
        f"Kashmir, using 5-fold spatial cross-validation with ~100 km blocks held out, the tuned model reaches ROC-AUC "
        f"{ci('v3 tuned', 'roc_auc')} versus {ci('v3 original', 'roc_auc')} for the untuned model and "
        f"{ci('v2', 'roc_auc')} for the earlier v2. At the app's alert level it catches "
        f"{pct('v3 tuned', 'alert', 'recall')} of landslides while flagging {pct('v3 tuned', 'alert', 'false_alarm_rate')} "
        f"of safe rows. Strict nested cross-validation gives ROC-AUC {r['nested']['roc_auc']:.3f}. "
        "The model is a risk indicator, not a precise slope-by-day predictor.", B)]

    s += [Paragraph('1. Data', H2), Paragraph(
        'Case-control design: each catalogued landslide (label 1) is paired with a nearby slope on the same day '
        '(5-30 km away, elevation within 300 m) and the same location on the same date in a year without a '
        'landslide (both label 0). Inputs come from the same feature code the live app uses (NASA IMERG V07 rain, '
        'SRTM terrain, MODIS vegetation, OpenLandMap soil).', B), Spacer(1, 4),
        table([['Row type', 'Rows']] + [[KIND_NAMES[k], v] for k, v in r['data']['by_kind'].items()] +
              [['Spatial blocks (CV groups)', r['data']['blocks']]], [90, 30]), Spacer(1, 6)]

    s += [Paragraph('2. Evaluation protocol', H2), Paragraph(
        'All scores are out-of-fold from 5-fold StratifiedGroupKFold, where a group is a 1 x 1 degree block, so '
        'test areas are never seen in training. 95% confidence intervals come from a cluster bootstrap '
        f'({N_BOOT} resamples of whole blocks). The tuned settings were chosen on all rows, so the out-of-fold '
        'figures here are slightly optimistic. The strictly separated nested-CV result is reported alongside. '
        'Operating points: <b>alert</b> = the app\'s MODERATE level (chosen to catch 70% of landslides for v3 tuned, '
        f'and score >= 40 for the old models as deployed); <b>matched</b> = each model\'s cut-off for 70% recall, which '
        'compares models at equal catch rates.', B)]

    s += [Paragraph('3. Results', H2)]
    head = ['Metric', 'v3 tuned', 'v3 original', 'v2']
    rows = [head,
            ['ROC-AUC [95% CI]'] + [ci(n, 'roc_auc') for n in ['v3 tuned', 'v3 original', 'v2']],
            ['PR-AUC [95% CI]'] + [ci(n, 'pr_auc') for n in ['v3 tuned', 'v3 original', 'v2']],
            ['Brier score (lower = better)'] + [f"{m[n]['ranking']['brier']:.3f}" for n in ['v3 tuned', 'v3 original', 'v2']]]
    for op, label in [('alert', 'alert level as deployed'), ('matched', 'matched 70% recall')]:
        rows.append([f'<b>At {label}</b>', '', '', ''])
        for k, lab in [('cutoff', 'Cut-off'), ('recall', 'Recall (caught)'), ('precision', 'Precision'),
                       ('false_alarm_rate', 'False alarm rate'), ('specificity', 'Specificity'), ('npv', 'NPV'),
                       ('accuracy', 'Accuracy'), ('balanced_accuracy', 'Balanced accuracy'), ('f1', 'F1'),
                       ('f2', 'F2 (recall-weighted)'), ('mcc', 'MCC')]:
            fmt = (lambda v: f'{v:.2f}') if k in ('cutoff', 'f1', 'f2', 'mcc') else (lambda v: f'{v:.0%}')
            rows.append([lab] + [fmt(m[n][op][k]) for n in ['v3 tuned', 'v3 original', 'v2']])
    s += [table(rows, [52, 40, 40, 38]), Spacer(1, 4), Paragraph(
        f"Paired cluster bootstrap, v3 tuned minus v3 original ROC-AUC: {r['paired_auc_diff']['mean']:+.3f} "
        f"[95% CI {r['paired_auc_diff']['ci'][0]:+.3f}, {r['paired_auc_diff']['ci'][1]:+.3f}]. "
        f"Nested CV (strict): tuned {r['nested']['roc_auc']:.3f} vs original {r['nested']['original_roc_auc']:.3f}; "
        f"overfitting gap {r['nested']['overfit_gap_original']:.2f} -> {r['nested']['overfit_gap_tuned']:.2f}.", CAP)]

    caps = {
        'roc': 'Figure 1. ROC curves on unseen areas. The dashed line is random guessing.',
        'pr': 'Figure 2. Precision-recall curves. The dashed line is the share of landslides in the data.',
        'cm': 'Figure 3. Confusion matrices at the alert level, as deployed. Cells show counts and the share of each true class.',
        'thr': 'Figure 4. Recall, precision and false-alarm rate for every possible cut-off (v3 tuned). Dotted lines mark the app\'s level boundaries.',
        'cal': 'Figure 5. Calibration. Training used 1 landslide per 2 safe rows, so raw outputs are not real-world probabilities; '
               'the app therefore maps outputs to levels by recall instead.',
        'dist': 'Figure 6. Out-of-fold score distribution by row type. Landslides and normal-year rows separate; nearby same-day slopes overlap heavily with landslides.',
        'cmp': 'Figure 7. ROC by comparison type: the model separates landslide days from normal days at the same place much better than neighbouring slopes on the same day.',
        'imp': 'Figure 8. Permutation importance on held-out folds (mean and SD over 5 folds x 5 shuffles). Inputs held constant in training show zero by design.',
        'pdp': 'Figure 9. Partial dependence: rain can only raise the output (monotone constraint), while slope has its own learned shape.',
        'lc': 'Figure 10. Learning curves (mean +/- SD over folds). The original model reaches about 1.0 on its training rows (memorisation); the tuned model keeps training and unseen scores close.',
        'fold': 'Figure 11. ROC-AUC per held-out fold.',
        'grp': 'Figure 12. Recall and false-alarm rate by region and season at the alert level (groups with 50+ rows).',
    }
    for key in ['roc', 'pr', 'cm', 'thr', 'cal', 'dist', 'cmp', 'imp', 'pdp', 'lc', 'fold', 'grp']:
        width = 120 if key in ('roc', 'pr', 'cal', 'cmp') else 170
        s.append(figure(key, caps[key], width))

    g = r['groups']
    s += [Paragraph('Results by group', H2),
          table([['Group', 'Rows', 'Landslides', 'Recall', 'False alarm rate', 'ROC-AUC']] +
                [[x['group'], x['rows'], x['landslides'], f"{x['recall']:.0%}", f"{x['false_alarm_rate']:.0%}",
                  '-' if x['roc_auc'] is None else f"{x['roc_auc']:.3f}"] for x in g], [44, 20, 24, 22, 32, 24]),
          Paragraph('Groups with fewer than 50 rows (plains states) are too small to judge; the app\'s plains rule handles them.', CAP)]

    s += [Paragraph('4. Discussion and limitations', H2)] + [Paragraph(t, B) for t in [
        '<b>What works:</b> the model separates landslide days from normal days at the same location, and its '
        'scores rise with rain as physics requires. Tuning removed memorisation without changing the 20 inputs.',
        '<b>What does not:</b> neighbouring slopes on the same day are barely separable (rain is measured in ~10 km '
        'squares and catalogue locations can be off by a few km), so false alarms stay high at useful recall.',
        '<b>Generalisation:</b> results vary by region and season (Figure 12). The landslide catalogue is small '
        '(552 events, 2007-2016) and news-based, so remote and recent events are under-represented, and '
        'evaluation shares that bias.',
        '<b>Use:</b> the outputs should be presented as risk warnings alongside official advisories, never as a '
        'statement that a landslide will occur.']]

    s += [Paragraph('5. Reproducibility', H2), Paragraph(
        f"Seed {SEED} for fold splits, bootstrap seed 42, {N_BOOT} resamples. Tuned settings: "
        f"{json.dumps(r['settings'])}. Re-run: <i>py -3.11 ai-module/v3/research_evaluation_v3.py</i>. "
        'All numbers are also in evaluation_report/metrics.json and tables/*.csv.', B)]

    pdf = os.path.join(OUT, 'EVALUATION_REPORT_v3.pdf')
    SimpleDocTemplate(pdf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=15 * mm,
                      bottomMargin=15 * mm, title='TerraAlert v3 Evaluation Report').build(s)
    return pdf


# ============================================================================== main
def main():
    os.makedirs(FIG, exist_ok=True)
    os.makedirs(TAB, exist_ok=True)
    best = load_best()
    if best is None:
        sys.exit('best_params_v3.json not found - run tune_v3.py first')

    # ---- data
    df = load_dataset()
    X, X2, y = feature_matrix(df, 'v3'), feature_matrix(df, 'v2'), df.label.to_numpy()
    groups = np.asarray(df['group'])
    print(f'{len(df)} rows, {int(y.sum())} landslides, {len(np.unique(groups))} spatial blocks')

    # ---- scores for the three models
    p_tuned, folds = out_of_fold(X, y, groups, best)
    p_orig, _ = out_of_fold(X, y, groups, None)
    P = {'v3 tuned': p_tuned, 'v3 original': p_orig, 'v2': v2_scores(X2)}
    with open(os.path.join(HERE, 'risk_thresholds_v3.json'), encoding='utf-8') as f:
        level_cuts = json.load(f)['thresholds']
    alert_cut = {'v3 tuned': level_cuts['MODERATE'], 'v3 original': OLD_APP_ALERT, 'v2': OLD_APP_ALERT}

    # ---- metrics with confidence intervals
    models = {}
    for name, p in P.items():
        print(f'  metrics + bootstrap for {name}...')
        models[name] = {
            'ranking': ranking_metrics(y, p),
            'ci': {'roc_auc': cluster_bootstrap(y, groups, p, roc_auc_score),
                   'pr_auc': cluster_bootstrap(y, groups, p, average_precision_score)},
            'alert': metrics_at(y, p, alert_cut[name]),                         # as deployed
            'matched': metrics_at(y, p, cutoff_for_recall(y, p, 0.70)),         # equal catch rate
            'default_0_5': metrics_at(y, p, 0.5),
        }
    diff = lambda yy, a, b: roc_auc_score(yy, a) - roc_auc_score(yy, b)
    paired = {'mean': float(diff(y, p_tuned, p_orig)),
              'ci': cluster_bootstrap(y, groups, (p_tuned, p_orig), diff)}

    # ---- per fold, per group
    per_fold = pd.DataFrame([{'model': n, 'fold': k + 1, 'rows': len(te), 'roc_auc': roc_auc_score(y[te], P[n][te]),
                              'recall': metrics_at(y[te], P[n][te], alert_cut[n])['recall']}
                             for n in ['v3 tuned', 'v3 original'] for k, (_, te) in enumerate(folds)])
    season = np.where(pd.to_datetime(df.date).dt.month.between(6, 9), 'Monsoon (Jun-Sep)', 'Rest of year')
    group_rows = []
    for label, mask in [*[(reg, (df.region == reg).to_numpy()) for reg in df.region.value_counts().index],
                        *[(s, season == s) for s in ['Monsoon (Jun-Sep)', 'Rest of year']]]:
        ym, pm = y[mask], p_tuned[mask]
        mm_ = metrics_at(ym, pm, alert_cut['v3 tuned'])
        group_rows.append({'group': label, 'rows': int(mask.sum()), 'landslides': int(ym.sum()),
                           'recall': mm_['recall'] if ym.sum() else float('nan'),
                           'false_alarm_rate': mm_['false_alarm_rate'] if (ym == 0).sum() else float('nan'),
                           'roc_auc': roc_auc_score(ym, pm) if 0 < ym.sum() < len(ym) else None})
    groups_df = pd.DataFrame(group_rows)

    # ---- final installed model (for partial dependence)
    model, scaler = joblib.load(os.path.join(HERE, 'xgboost_model_v3.pkl')), joblib.load(os.path.join(HERE, 'scaler_v3.pkl'))

    # ---- figures
    print('  drawing figures...')
    figs = {
        'roc': fig_roc(y, P), 'pr': fig_pr(y, P),
        'cm': fig_confusion(y, [('v3 tuned (now)', p_tuned, alert_cut['v3 tuned']),
                                ('v3 original (before)', p_orig, OLD_APP_ALERT), ('v2', P['v2'], OLD_APP_ALERT)]),
        'thr': fig_thresholds(y, p_tuned, level_cuts),
        'cal': fig_calibration(y, {k: P[k] for k in ['v3 tuned', 'v3 original']}),
        'dist': fig_score_distribution(df, p_tuned, alert_cut['v3 tuned']),
        'cmp': fig_roc_by_comparison(df, y, p_tuned),
    }
    print('  permutation importance...')
    imp = permutation_importance(X, y, folds, best)
    figs['imp'] = fig_importance(imp)
    figs['pdp'] = fig_partial_dependence(X, model, scaler, best)
    print('  learning curves...')
    curves = {}
    for name, b in [('v3 original (200 trees, depth 6)', None), ('v3 tuned', best)]:
        lc = learning_curve(X, y, folds, b)
        lc[('n_train', 'mean')] = [int(len(folds[0][0]) * f) for f in lc.index]
        curves[name] = lc
    figs['lc'] = fig_learning(curves)
    figs['fold'] = fig_per_fold(per_fold)
    figs['grp'] = fig_groups(groups_df)

    # ---- nested-CV headline from tune_v3.py (the strict number)
    with open(os.path.join(HERE, 'tune_results_v3.json'), encoding='utf-8') as f:
        tr = json.load(f)
    nested = {'roc_auc': tr['tuned_fair_test']['roc_auc']['mean'], 'original_roc_auc': tr['original_fair_test']['roc_auc']['mean'],
              'overfit_gap_tuned': tr['final_check']['overfit_gap'], 'overfit_gap_original': tr['original_fair_test']['overfit']['overfit_gap']}

    # ---- save tables and json
    flat = pd.DataFrame({n: {**{f'{k}': v for k, v in d['ranking'].items()},
                             **{f'roc_auc_ci_low': d['ci']['roc_auc'][0], 'roc_auc_ci_high': d['ci']['roc_auc'][1]},
                             **{f'alert_{k}': v for k, v in d['alert'].items()},
                             **{f'matched_{k}': v for k, v in d['matched'].items()}} for n, d in models.items()})
    flat.round(4).to_csv(os.path.join(TAB, 'metrics_summary.csv'))
    per_fold.round(4).to_csv(os.path.join(TAB, 'per_fold.csv'), index=False)
    groups_df.round(4).to_csv(os.path.join(TAB, 'per_group.csv'), index=False)
    imp.round(4).to_csv(os.path.join(TAB, 'feature_importance.csv'))
    result = {
        'generated_at': datetime.now().isoformat(timespec='seconds'),
        'data': {'rows': len(df), 'landslides': int(y.sum()), 'blocks': int(len(np.unique(groups))),
                 'by_kind': df.kind.value_counts().to_dict()},
        'settings': best, 'models': models, 'paired_auc_diff': paired, 'nested': nested,
        'groups': groups_df.replace({np.nan: None}).to_dict('records'),
    }
    with open(os.path.join(OUT, 'metrics.json'), 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, default=lambda o: o.item() if hasattr(o, 'item') else str(o))

    pdf = write_pdf(result, figs)

    # ---- console summary
    print('\n' + '=' * 78)
    for n, d in models.items():
        a = d['alert']
        print(f"{n:12s} ROC-AUC {d['ranking']['roc_auc']:.3f} [{d['ci']['roc_auc'][0]:.3f}-{d['ci']['roc_auc'][1]:.3f}]"
              f" | alert cut {a['cutoff']:.2f}: recall {a['recall']:.0%}, false alarms {a['false_alarm_rate']:.0%},"
              f" precision {a['precision']:.0%}, accuracy {a['accuracy']:.0%}, MCC {a['mcc']:.2f}")
    print(f"tuned - original ROC-AUC: {paired['mean']:+.3f} [95% CI {paired['ci'][0]:+.3f}, {paired['ci'][1]:+.3f}]")
    print(f'\nReport: {pdf}\nFigures: {FIG}\nTables: {TAB}')


if __name__ == '__main__':
    main()
