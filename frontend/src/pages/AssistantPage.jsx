import { usePrediction } from '../context/PredictionContext'
import Chatbot from '../components/Chatbot'
import { PageTransition, FadeInUp } from '../components/animations/PageTransition'

export default function AssistantPage() {
    const { prediction } = usePrediction()

    return (
        <PageTransition>
            <div className="mb-6">
                <FadeInUp>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Terra Alert Assistant
                    </h1>
                    <p className="text-white/60 text-sm">
                        Ask about landslide first aid, or get location-aware help after a risk assessment
                    </p>
                </FadeInUp>
            </div>
            <FadeInUp delay={0.1}>
                <Chatbot prediction={prediction} />
            </FadeInUp>
        </PageTransition>
    )
}