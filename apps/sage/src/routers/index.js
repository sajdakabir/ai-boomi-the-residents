import AuthRouter from "./core/auth.route.js";
import UserRouter from "./core/user.route.js";
import { JWTMiddleware } from "../middlewares/jwt.middleware.js";
import ArrayRouter from "./lib/array.route.js";
import CommonRouter from "./lib/common.route.js";
import LinearRoute from "./integration/linear.route.js";
import CalenderRoute from "./integration/calendar.route.js";
import EmailRoute from "./integration/email.route.js";
import GithubRoute from "./integration/github.route.js";
import NotionRoute from "./integration/notion.route.js";
import XRoute from "./integration/x.route.js";
import { intelligentAIRouter } from "./ai/intelligent-ai.route.js";
import { enhancedIntelligentAIRouter } from "./ai/enhanced-intelligent-ai.route.js";
import { voiceRouter } from "./voice.router.js";

/**
 * @param {import('express').Application} app
 */

const initRoutes = (app) => {
    app.use("/auth", AuthRouter);
    app.use("/users", JWTMiddleware, UserRouter);
    app.use("/arrays", JWTMiddleware, ArrayRouter);
    app.use("/api", JWTMiddleware, CommonRouter);
    app.use('/linear', JWTMiddleware, LinearRoute);
    app.use('/calendar', JWTMiddleware, CalenderRoute);
    app.use('/gmail', JWTMiddleware, EmailRoute);
    app.use('/github', JWTMiddleware, GithubRoute);
    app.use('/notion', JWTMiddleware, NotionRoute);
    app.use('/x', JWTMiddleware, XRoute);
    app.use('/ai/intelligent', JWTMiddleware, intelligentAIRouter);
    app.use('/ai/enhanced', JWTMiddleware, enhancedIntelligentAIRouter);
    app.use('/ai/voice', JWTMiddleware, voiceRouter);
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
