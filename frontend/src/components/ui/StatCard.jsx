const StatCard = ({ icon, label, value, sub, color = 'primary' }) => {
    const colors = {
        primary:   'bg-primary-500/10 text-primary-400',
        secondary: 'bg-secondary-500/10 text-secondary-400',
        success:   'bg-green-500/10 text-green-400',
        warning:   'bg-yellow-500/10 text-yellow-400',
        error:     'bg-red-500/10 text-red-400',
    }

    return (
        <div className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-2xl font-heading font-bold text-dark-100">
                    {value}
                </p>
                <p className="text-sm text-dark-400 truncate">{label}</p>
                {sub && (
                    <p className="text-xs text-dark-500 truncate">{sub}</p>
                )}
            </div>
        </div>
    )
}

export default StatCard