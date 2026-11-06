// Único catálogo autorizado. P64 usa exclusivamente la ubicación validada.
// No completar otras variantes ni migrar registros históricos desde este catálogo.
const Parcelas = (() => {
    const catalogo = Object.freeze({
        P61:Object.freeze({latitud:-8.520616,longitud:-78.732651}),
        P62:Object.freeze({latitud:-8.550790804,longitud:-78.65676825}),
        P64:Object.freeze({latitud:-8.5456913,longitud:-78.6505618}),
        P66:Object.freeze({latitud:-8.525856,longitud:-78.736292}),
        P67:Object.freeze({latitud:-8.529746,longitud:-78.724780}),
        P68:Object.freeze({latitud:-8.534171,longitud:-78.729616}),
        P69:Object.freeze({latitud:-8.536455,longitud:-78.734415}),
        P70:Object.freeze({latitud:-8.536848,longitud:-78.718392}),
        P81:Object.freeze({latitud:-8.544882,longitud:-78.648746}),
        P82:Object.freeze({latitud:-8.544967,longitud:-78.649787}),
        P83:Object.freeze({latitud:-8.543854,longitud:-78.650351}),
        P84:Object.freeze({latitud:-8.543507,longitud:-78.651454}),
        P85:Object.freeze({latitud:-8.544138,longitud:-78.647735}),
        P86:Object.freeze({latitud:-8.543204,longitud:-78.646914})
    });
    function codigo(value) {
        const match = String(value??'').trim().match(/^(?:P\s*|Parcela\s+)(\d+)$/i);
        return match?'P'+match[1]:null;
    }
    function ubicacion(value) {
        const parcela = codigo(value);
        const coords = Object.hasOwn(catalogo,parcela)?catalogo[parcela]:null;
        return coords?{...coords,fuente:'catalogo_parcelas',parcela,versionCatalogo:'2026-11-06'}:null;
    }
    const codigos=Object.freeze(Object.keys(catalogo));
    const nombres=Object.freeze(codigos.map(code=>`Parcela ${code.slice(1)}`));
    return Object.freeze({codigo,ubicacion,codigos,nombres});
})();
