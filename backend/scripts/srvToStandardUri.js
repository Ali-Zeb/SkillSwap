const dns = require('dns').promises;

/**
 * Converts a mongodb+srv:// URI into an equivalent standard mongodb:// URI
 * by resolving the SRV record ourselves.
 *
 * Some networks time out on the DNS TXT lookup that the driver performs
 * for +srv URIs (error "queryTxt ETIMEOUT") even though SRV lookups work.
 * The TXT record only carries authSource/replicaSet, so we set
 * authSource=admin + tls=true (Atlas defaults) and let the driver discover
 * the replica set from the seed hosts.
 *
 * Runs in-process only — the resulting URI (which contains credentials)
 * is never logged. Non-+srv URIs are returned unchanged.
 */
const srvToStandardUri = async (uri) => {
    if (!uri.startsWith('mongodb+srv://')) return uri;

    const parsed = new URL(uri.replace(/^mongodb\+srv:\/\//, 'http://'));
    const records = await dns.resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
    if (records.length === 0) {
        throw new Error('SRV lookup returned no hosts');
    }

    const hosts = records.map((r) => `${r.name}:${r.port}`).join(',');
    const auth  = parsed.username
        ? `${parsed.username}${parsed.password ? ':' + parsed.password : ''}@`
        : '';

    const params = new URLSearchParams(parsed.search);
    if (!params.has('tls') && !params.has('ssl')) params.set('tls', 'true');
    if (!params.has('authSource'))                params.set('authSource', 'admin');

    const dbPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '/';
    return `mongodb://${auth}${hosts}${dbPath}?${params.toString()}`;
};

module.exports = srvToStandardUri;
