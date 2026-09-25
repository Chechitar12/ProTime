const Incidencias = {
    all() {
        return DB.get('pt_incidencias_v3', []);
    },

    save(incidencia) {
        const incidencias = this.all();
        incidencias.unshift(incidencia);
        DB.set('pt_incidencias_v3', incidencias);
    },

    byId(id) {
        return this.all().find((incidencia) => incidencia.id === id);
    },

    update(id, cambios) {
        const actualizadas = this.all().map((incidencia) => {
            return incidencia.id === id
                ? { ...incidencia, ...cambios }
                : incidencia;
        });

        DB.set('pt_incidencias_v3', actualizadas);
    }
};
