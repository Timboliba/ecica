const router = require("express").Router();
const fs = require("node:fs/promises");
const path = require("node:path");

router.get("/", async (req, res, next) => {
    try {
        const emploisDir = path.join(process.cwd(), "public", "emplois");
        const entries = await fs.readdir(emploisDir, { withFileTypes: true });

        const emploisFiles = entries
            .filter((entry) => entry.isFile())
            .map((entry) => {
                const ext = path.extname(entry.name).toLowerCase();
                const encodedName = encodeURIComponent(entry.name);
                return {
                    name: entry.name,
                    url: `/emplois/${encodedName}`,
                    isPdf: ext === ".pdf",
                    isImage: [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext),
                    isExcel: [".xlsx", ".xls"].includes(ext)
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));

        res.render("emploisList.pug", { emploisFiles });
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.render("emploisList.pug", { emploisFiles: [] });
        }
        return next(error);
    }
});

module.exports = router;
