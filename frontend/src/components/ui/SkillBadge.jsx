import { getCategoryColor } from '../../utils/helpers'

const PROFICIENCY_COLORS = {
    beginner:     'text-blue-400 bg-blue-500/10',
    intermediate: 'text-yellow-400 bg-yellow-500/10',
    advanced:     'text-orange-400 bg-orange-500/10',
    expert:       'text-red-400 bg-red-500/10',
}

const SkillBadge = ({
    skill,
    type,
    showProficiency = false,
    showRemove = false,
    onRemove,
}) => {
    const skillName = skill?.skillId?.name || skill?.name || ''
    const category  = skill?.skillId?.category || skill?.category || ''
    const proficiency = skill?.proficiency || 'intermediate'

    return (
        <div className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm
            border transition-all duration-200
            ${type === 'teach'
                ? 'bg-primary-500/10 border-primary-500/20 text-primary-300'
                : 'bg-secondary-500/10 border-secondary-500/20 text-secondary-300'
            }
        `}>
            <span className="font-medium truncate max-w-[120px]">{skillName}</span>

            {showProficiency && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${PROFICIENCY_COLORS[proficiency]}`}>
                    {proficiency}
                </span>
            )}

            {showRemove && onRemove && (
                <button
                    onClick={onRemove}
                    className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity text-xs leading-none"
                    title="Remove skill"
                >
                    ✕
                </button>
            )}
        </div>
    )
}

export default SkillBadge