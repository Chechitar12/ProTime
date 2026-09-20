const DB = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? defaultValue : JSON.parse(value);
        } catch (error) {
            return defaultValue;
        }
    },

    set(key, value) {
        if (value === null) {
            localStorage.removeItem(key);
            return;
        }

        localStorage.setItem(key, JSON.stringify(value));
    }
};
