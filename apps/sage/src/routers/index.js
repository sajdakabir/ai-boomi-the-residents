import AuthRouter from "./core/auth.route.js";
import UserRouter from "./core/user.route.js";
import { JWTMiddleware } from "../middlewares/jwt.middleware.js";
import ArrayRouter from "./lib/array.router.js";
import CommonRouter from "./lib/common.router.js";

/**
 * @param {import('express').Application} app
 */

const initRoutes = (app) => {
    app.use("/auth", AuthRouter);
    app.use("/user", UserRouter);
    app.use("/arrays", JWTMiddleware, ArrayRouter);
    app.use("/api", JWTMiddleware, CommonRouter);
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
