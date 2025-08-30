import Joi from "joi";
import { updateUser } from "../../services/core/user.service.js";
import { UpdateUserPayload } from "../../payloads/core/user.payload.js";


const { ValidationError } = Joi;

const userProfileController = async (req, res, next) => {
    try {
        const user = req.user;
        const {
            integration,
            uuid,
            fullName,
            userName,
            avatar,
            roles,
            timezone,
            accounts
        } = user.toObject ? user.toObject() : user;

        const response = {
            uuid,
            fullName,
            userName,
            avatar,
            roles,
            timezone,
            accounts,
            integrations: {
                linear: { connected: integration.linear.connected },
                googleCalendar: { connected: integration.googleCalendar.connected },
                gmail: { connected: integration.gmail.connected },
                github: { connected: integration.github.connected },
                x: { connected: integration.x.connected },
                notion: { connected: integration.notion.connected }
            }
        };

        res.json(response);
    } catch (err) {
        next(err);
    }
};

const updateUserController = async (req, res, next) => {
    try {
        const user = req.user;
        const data = req.body;
        const payload = await UpdateUserPayload.validateAsync(data)

        await updateUser(user, payload);

        res.json({
            message: "Updated successfully"
        });
    } catch (err) {
        const error = new Error(err);
        error.statusCode =
        err instanceof ValidationError ? 400 : err.statusCode || 500;
        next(error);
    }
};

export {
    userProfileController,
    updateUserController,
};
