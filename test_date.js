const str1 = "25/02/2026";
const str2 = "2026-02-25T00:00:00.000Z";

function parseFecha(str) {
    if (!str) return null;
    if (str instanceof Date) {
        const d = new Date(str);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    const parts = str.toString().split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0], 23, 59, 59, 999);
    }
    
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
         d.setHours(23, 59, 59, 999);
         return d;
    }
    return null;
}

console.log(parseFecha(str1));
console.log(parseFecha(str2));

const now = new Date();
console.log("now:", now);
console.log("deadline > now?", parseFecha(str1) > now);

