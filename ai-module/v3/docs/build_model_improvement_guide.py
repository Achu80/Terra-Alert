"""Builds MODEL_IMPROVEMENT_GUIDE.pdf: a plain-language learning guide and the step-by-step plan.

Run from the repository root:
    py -3.11 ai-module/v3/docs/build_model_improvement_guide.py
"""
import json
import os

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle)

HERE = os.path.dirname(os.path.abspath(__file__))
V3 = os.path.dirname(HERE)
RESULTS = os.path.join(V3, 'results')
OUT = os.path.join(HERE, 'MODEL_IMPROVEMENT_GUIDE.pdf')

ss = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=ss['Heading1'], fontSize=17, spaceAfter=8, textColor=colors.HexColor('#1d3557'))
H2 = ParagraphStyle('H2', parent=ss['Heading2'], fontSize=13, spaceBefore=10, spaceAfter=5,
                    textColor=colors.HexColor('#1d3557'))
BODY = ParagraphStyle('BODY', parent=ss['BodyText'], fontSize=9.5, leading=13.5, spaceAfter=5)
SMALL = ParagraphStyle('SMALL', parent=BODY, fontSize=8.5, leading=11.5, textColor=colors.HexColor('#444444'))
CODE = ParagraphStyle('CODE', parent=BODY, fontName='Courier', fontSize=8.2, leading=10.5,
                      backColor=colors.HexColor('#f2f4f7'), borderPadding=4, spaceBefore=3, spaceAfter=7)


def table(rows, widths):
    t = Table([[Paragraph(str(c), SMALL) for c in r] for r in rows], colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dfe7f3')),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#9aa5b1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t


def pct(x):
    return f'{x * 100:.1f}%'


def main():
    acc = pd.read_csv(os.path.join(RESULTS, 'accuracy_table_v3.csv')).iloc[0].to_dict()
    with open(os.path.join(RESULTS, 'time_split_v3.json'), encoding='utf-8') as f:
        ts = json.load(f)
    with open(os.path.join(RESULTS, 'hp_landslides_cleaning_report.json'), encoding='utf-8') as f:
        cl = json.load(f)

    s = []
    s.append(Paragraph('TerraAlert v3 landslide model: how it works, what we are improving, and why', H1))
    s.append(Paragraph('A learning guide written as we go. Each step says what we did, why, and what the numbers mean. '
                       'Keep it with the project so future changes can be checked against the same plan.', SMALL))

    s.append(Paragraph('1. What the model does', H2))
    s.append(Paragraph(
        'The model looks at one place on one day and gives a risk score from 0 to 1. It uses 20 inputs: rain over '
        'the last 3, 7, 14 and 30 days, slope, elevation, aspect, vegetation (NDVI), moisture (NDWI) and soil type, '
        'plus a few combinations of these. It was trained on <b>552 recorded landslides</b> and, for each one, two kinds '
        'of "safe" examples: a nearby slope on the same day, and the same spot in a normal year. '
        'The score is turned into a warning level (Low, Moderate, High, Critical) by cut-offs chosen from honest test scores.', BODY))

    s.append(Paragraph('2. Words you need', H2))
    terms = [
        ['Term', 'Plain meaning'],
        ['Accuracy', 'Share of all places called right (safe or landslide). Misleading here: 2 of 3 places are safe, so never warning scores 66%.'],
        ['Recall (catch rate)', 'Share of real landslides that got an alert. 70% means 7 in 10 caught.'],
        ['Precision', 'Share of alerts that were followed by a real landslide.'],
        ['False alarm rate', 'Share of safe places that got an alert wrongly.'],
        ['Balanced accuracy', 'Average of recall and "safe places cleared". Fair when safe places are far more common.'],
        ['ROC-AUC', 'How well the score ranks risky places above safe ones, from 0.5 (guessing) to 1.0 (perfect). Cut-off free.'],
        ['Out-of-fold test', 'Each area is scored by a model that never saw it while training.'],
        ['Overfitting', 'Learning the training rows by heart. Shows as a big gap between training and test scores.'],
        ['Data leakage', 'Test information sneaking into training. It makes scores look better than they are.'],
        ['Time-based test', 'Train on older years, test on newer years. Checks that the model works on future events.'],
        ['Cut-off (threshold)', 'The score above which we raise an alert. Moving it trades missed landslides against false alarms.'],
    ]
    s.append(table(terms, [38 * mm, 135 * mm]))

    s.append(Paragraph('3. Where the model stands today', H2))
    rows = [
        ['Measure (honest out-of-fold test, 1,610 rows)', 'Value'],
        ['Accuracy at the MODERATE alert level', pct(acc['accuracy'])],
        ['Balanced accuracy', pct(acc['balanced_accuracy'])],
        ['Landslides caught (recall)', pct(acc['recall'])],
        ['Alerts that were real (precision)', pct(acc['precision'])],
        ['ROC-AUC', f"{acc['roc_auc']:.3f}"],
    ]
    s.append(table(rows, [120 * mm, 40 * mm]))
    s.append(Spacer(1, 4))
    s.append(Paragraph(
        'Reading these: the model catches about 7 in 10 past landslides, but about half of its alerts are false alarms. '
        'Accuracy looks low mainly because most places are safe. This is a useful early warning, not a precise forecast.', BODY))

    s.append(Paragraph('4. The plan and where each step stands', H2))
    plan = [
        ['Step', 'What it means', 'Status'],
        ['1. Better landslide records', 'Add the Himachal landslide list with usable dates and locations.',
         f"CLEANED. {cl['output_rows']} events with a real year kept from {cl['input_rows']} rows. "
         f"Only {cl['rows_with_full_day']} have a full day, so same-day controls are not possible. Details below."],
        ['2. Ground inputs (geology, soil moisture)', 'Add rock type and soil moisture the model cannot see today.',
         'Needs your approval: it changes the 20-input list the app sends, which you asked us to keep.'],
        ['3. Honest time-based test', 'Train on 2007-2013, test on 2014-2016.',
         f"DONE. ROC-AUC {ts['roc_auc']:.3f}, recall {pct(ts['recall'])} on {ts['test_landslides']} later landslides."],
        ['4. Alert level choice', 'Pick the trade-off between missed landslides and false alarms.',
         'Policy decision with HPSDMA. Options are listed below.'],
    ]
    s.append(table(plan, [40 * mm, 65 * mm, 68 * mm]))

    s.append(Paragraph('Step 1 in detail: cleaning the Himachal landslide list', H2))
    s.append(Paragraph(
        'What we received: a file of 6,539 Himachal landslide rows (hp_landslides.csv). Every row is a landslide, so there are '
        'no safe examples in it. The file is kept unchanged in ai-module/data/raw/.', BODY))
    s.append(Paragraph(
        'What we did, in order (script: ai-module/v3/build/clean_hp_landslides.py):', BODY))
    steps = [
        f"1. Tidied the text. Removed spaces at the ends and turned placeholders ('#N/A', blank, '0') into blanks.",
        f"2. Kept rows with a numeric latitude and longitude. Dropped: {cl['dropped_bad_coordinates']}.",
        f"3. Kept rows inside a Himachal box (lat 30.3-33.3, lon 75.5-79.0). Dropped: {cl['dropped_outside_himachal_box']}.",
        f"4. Kept rows with a real year (1900-2026). The year '0' was treated as missing, not as a date. "
        f"Dropped: {cl['dropped_no_real_year']}. This was the biggest loss.",
        f"5. Read a full day from the history text only when it was written out, such as '14th August 2023'. "
        f"Found in {cl['rows_with_full_day']} rows.",
        f"6. Removed duplicates: same year and same place (coordinates to 3 decimals, about 100 m). Dropped: {cl['dropped_duplicates']}.",
    ]
    for t in steps:
        s.append(Paragraph(t, BODY))
    s.append(Paragraph(
        f"Result: {cl['output_rows']} landslides saved to ai-module/data/v3/hp_landslides_clean.csv, years "
        f"{cl['years_range'][0]}-{cl['years_range'][1]}. Before 2014: {cl['before_2014']}; 2014-2016: {cl['2014_2016']}; "
        f"2017 onward: {cl['2017_on']}. The 2015 count is high ({cl['rows_2015']}), which may be one reporting batch; "
        f"this should be checked before use.", BODY))
    s.append(Paragraph(
        'What this means for the model: the file has real locations and years, so it can feed the time-based test. '
        'It cannot yet build the same-day controls, because almost every row has only a year. It also has no safe examples. '
        'So step 1 is cleaned but not yet used to retrain the model. Retraining would need controls built from the cleaned '
        'events, and the 20 inputs would stay the same.', BODY))

    s.append(Paragraph('Step 3 in detail', H2))
    s.append(Paragraph(
        f"We trained only on events before 2014 ({ts['train_landslides']} landslides) and tested on 2014-2016 "
        f"({ts['test_landslides']} landslides). The landslide and its controls always go into the same period, so no event is split. "
        f"The results were: ROC-AUC {ts['roc_auc']:.3f} (spatial test 0.613), recall {pct(ts['recall'])} (spatial 70%), "
        f"balanced accuracy {pct(ts['balanced_accuracy'])}. The model keeps most of its skill on later years.", BODY))
    s.append(Paragraph(
        'Caveats we must state: (a) the test has only about 170 landslides, so each number has a margin of error of a few points; '
        '(b) the alert level was chosen using all years, so this test is slightly kinder to the model than a fully fresh test would be.', BODY))

    s.append(Paragraph('Step 4 options for the alert level (for HPSDMA to decide)', H2))
    opts = [
        ['Option', 'Effect (from the honest test)', 'Trade-off'],
        ['Lower cut-off (more alerts), about 0.43', 'About 79% caught, about 66% of safe places alerted', 'Warns more often; people may stop listening'],
        ['Current cut-off, 0.47 (MODERATE)', 'About 70% caught, about 53% of safe places alerted', 'Balanced choice used in the app today'],
        ['Higher cut-off (fewer alerts), about 0.52', 'About 50% caught, about 33% of safe places alerted', 'Quieter, but misses half of landslides'],
    ]
    s.append(table(opts, [45 * mm, 70 * mm, 63 * mm]))

    s.append(Paragraph('5. Lessons so far (for future work)', H2))
    lessons = [
        'Never judge a model by accuracy alone when one outcome is rare. Use recall, false alarms and balanced accuracy.',
        'Test on areas and years the model has never seen. A score on rows it trained on is not evidence.',
        'Choose settings and cut-offs with inner tests, then report one untouched final test.',
        'Do not change the test to reach a target number. Target 80% accuracy would need a test that hides the hard cases.',
        'Check each change against the same honest test. If it does not help there, it does not go into the app.',
        'Data quality limits the ceiling. Better labels and ground inputs matter more than tuning.',
    ]
    for item in lessons:
        s.append(Paragraph('- ' + item, BODY))

    s.append(Paragraph('6. How to reproduce the numbers', H2))
    s.append(Preformatted(
        'py -3.11 ai-module/v3/build/clean_hp_landslides.py          # step 1: clean the Himachal landslide list\n'
        'py -3.11 ai-module/v3/evaluate/evaluate_v3_like_v2.py       # accuracy table, ROC, confusion matrix\n'
        'py -3.11 ai-module/v3/evaluate/time_split_test_v3.py        # step 3: time-based test\n'
        'py -3.11 ai-module/v3/evaluate/research_evaluation_v3.py    # full report (about 5 min)\n'
        'py -3.11 -m pytest ai-module/v3/evaluate/test_model_evaluation.py -v -s',
        CODE))
    s.append(Paragraph('Outputs are written to ai-module/v3/results/. Model files are rebuilt by ai-module/v3/train/.', SMALL))

    doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title='TerraAlert v3 model: learning guide and improvement plan')
    doc.build(s)
    print('Saved:', OUT)


if __name__ == '__main__':
    main()
