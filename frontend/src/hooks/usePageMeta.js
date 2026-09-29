import { useEffect } from 'react'

const SITE = 'SkillSwap'

/**
 * Sets the document title and meta description for the current page
 * (restored to the previous values when the page unmounts).
 */
const usePageMeta = function(title, description) {
    useEffect(function() {
        const previousTitle = document.title
        document.title = title ? title + ' · ' + SITE : SITE

        let meta = document.querySelector('meta[name="description"]')
        if (!meta) {
            meta = document.createElement('meta')
            meta.setAttribute('name', 'description')
            document.head.appendChild(meta)
        }
        const previousDescription = meta.getAttribute('content')
        if (description) meta.setAttribute('content', description)

        return function() {
            document.title = previousTitle
            if (previousDescription !== null) meta.setAttribute('content', previousDescription)
        }
    }, [title, description])
}

export default usePageMeta
