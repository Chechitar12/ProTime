// Único catálogo autorizado. P64 usa exclusivamente la ubicación validada.
// No completar otras variantes ni migrar registros históricos desde este catálogo.
const Parcelas = (() => {
    const catalogo = Object.freeze({
        P61:Object.freeze({latitud:-8.520616,longitud:-78.732651}),
        P62:Object.freeze({latitud:-8.550790804,longitud:-78.65676825}),
        P64:Object.freeze({latitud:-8.5456913,longitud:-78.6505618})
    });
    function codigo(value) {
        const match = String(value??'').trim().match(/^(?:P\s*|Parcela\s+)(\d+)$/i);
        return match?'P'+match[1]:null;
    }
    function ubicacion(value) {
        const parcela = codigo(value);
        const coords = Object.hasOwn(catalogo,parcela)?catalogo[parcela]:null;
        return coords?{...coords,fuente:'catalogo_parcelas',parcela,versionCatalogo:'2026-11-03'}:null;
    }
    return Object.freeze({codigo,ubicacion});
})();
