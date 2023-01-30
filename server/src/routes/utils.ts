import express from 'express';

const checkNewInstallationBody = (req: express.Request): boolean => {
    if (req.body.app_name === undefined || req.body.app_version === undefined || req.socket.remoteAddress === undefined) {
        return false;
    }
    return true;
};
const checkNewHeartbeatBody = (req: express.Request): boolean => {
    if (!checkNewInstallationBody(req) || req.body.installation_id === undefined) {
        return false;
    }
    return true;
};

const successResponse = (res: express.Response, message: string, data: object = {}): express.Response => {
    return res.status(200).json({
        status: 'success',
        message,
        data
    });
};

const errorResponse = (res: express.Response, code: number, message: string, data: object = {}): express.Response => {
    return res.status(code).json({
        status: 'error',
        message,
        data
    });
};

export default {
    successResponse,
    errorResponse,
    checkNewInstallationBody,
    checkNewHeartbeatBody
};