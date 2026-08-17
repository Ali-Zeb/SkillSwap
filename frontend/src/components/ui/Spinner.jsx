const Spinner = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-3.5 h-3.5',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
        xl: 'w-10 h-10',
    }

    return (
        <div
            className={`${sizes[size]} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
            role="status"
            aria-label="Loading"
        />
    )
}

export default Spinner