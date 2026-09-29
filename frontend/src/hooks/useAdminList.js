import { useCallback, useEffect, useState } from 'react'
import api from '../api/axios'

/**
 * Loads a paginated /api/admin list endpoint and reloads whenever the
 * query params change. `loading` is derived from whether the latest
 * request key has finished, so stale responses are ignored and no state
 * is set synchronously inside the effect.
 *
 * Returns { items, setItems, pagination, loading, error, reload }.
 */
const useAdminList = function(endpoint, params) {
    const [version, setVersion] = useState(0)
    const [result,  setResult]  = useState({ key: null, items: [], pagination: null, error: null })

    const requestKey = endpoint + '|' + JSON.stringify(params) + '|' + version

    useEffect(function() {
        let cancelled = false
        const query = Object.fromEntries(
            Object.entries(JSON.parse(requestKey.split('|')[1])).filter(function([, v]) { return v !== '' && v !== undefined && v !== null })
        )
        api.get(endpoint, { params: query })
            .then(function({ data }) {
                if (!cancelled) setResult({ key: requestKey, items: data.items || [], pagination: data.pagination || null, error: null })
            })
            .catch(function(err) {
                if (!cancelled) setResult(function(prev) { return { ...prev, key: requestKey, error: err.response?.data?.message || 'Failed to load data' } })
            })
        return function() { cancelled = true }
    }, [endpoint, requestKey])

    const setItems = useCallback(function(updater) {
        setResult(function(prev) { return { ...prev, items: typeof updater === 'function' ? updater(prev.items) : updater } })
    }, [])

    const reload = useCallback(function() { setVersion(function(v) { return v + 1 }) }, [])

    return {
        items:      result.items,
        setItems,
        pagination: result.pagination,
        loading:    result.key !== requestKey,
        error:      result.error,
        reload
    }
}

export default useAdminList
