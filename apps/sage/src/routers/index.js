import AuthRouter from "./core/auth.route.js";


/**
 * @param {import('express').Application} app
 */

const initRoutes = (app) => {
    app.use("/auth", AuthRouter);
   
    app.get("/", async (req, res) => {
        res.json({
            "message": "Welcome to  sage "
        })
    })

    app.use("*", (req, res) => {
        res.status(404).json({
            "status": 404,
            "message": "Invalid route"
        })
    })
}

export {
    initRoutes
}
