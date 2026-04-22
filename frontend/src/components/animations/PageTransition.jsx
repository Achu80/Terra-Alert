// Page transition wrapper with Framer Motion
// Install framer-motion first: npm install framer-motion

import { motion } from 'framer-motion'

const pageVariants = {
    initial: {
        opacity: 0,
        y: 20
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.6, -0.05, 0.01, 0.99]
        }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: {
            duration: 0.3
        }
    }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

const fadeInUp = {
    initial: {
        opacity: 0,
        y: 20
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [0.6, -0.05, 0.01, 0.99]
        }
    }
}

export function PageTransition({ children }) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            {children}
        </motion.div>
    )
}

export function StaggerContainer({ children, className = '' }) {
    return (
        <motion.div
            className={className}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
        >
            {children}
        </motion.div>
    )
}

export function FadeInUp({ children, delay = 0, className = '' }) {
    return (
        <motion.div
            className={className}
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ delay }}
        >
            {children}
        </motion.div>
    )
}

export function ScaleIn({ children, delay = 0, className = '' }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
                duration: 0.4, 
                delay,
                ease: [0.6, -0.05, 0.01, 0.99]
            }}
        >
            {children}
        </motion.div>
    )
}

export function SlideIn({ children, direction = 'left', delay = 0, className = '' }) {
    const directions = {
        left: { x: -20 },
        right: { x: 20 },
        up: { y: -20 },
        down: { y: 20 }
    }

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, ...directions[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ 
                duration: 0.5, 
                delay,
                ease: [0.6, -0.05, 0.01, 0.99]
            }}
        >
            {children}
        </motion.div>
    )
}
