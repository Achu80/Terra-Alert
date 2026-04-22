// Simple CSS-based transitions (no framer-motion required)
// Use this until framer-motion is installed

export function PageTransition({ children }) {
    return (
        <div className="animate-fadeInUp">
            {children}
        </div>
    )
}

export function StaggerContainer({ children, className = '' }) {
    return (
        <div className={`${className} animate-fadeIn`}>
            {children}
        </div>
    )
}

export function FadeInUp({ children, delay = 0, className = '' }) {
    return (
        <div 
            className={`${className} animate-fadeInUp`}
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    )
}

export function ScaleIn({ children, delay = 0, className = '' }) {
    return (
        <div 
            className={`${className} animate-scaleIn`}
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    )
}

export function SlideIn({ children, direction = 'left', delay = 0, className = '' }) {
    const animationClass = {
        left: 'animate-slideInLeft',
        right: 'animate-slideInRight',
        up: 'animate-slideInUp',
        down: 'animate-slideInDown'
    }[direction]

    return (
        <div 
            className={`${className} ${animationClass}`}
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    )
}
