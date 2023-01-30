import express from 'express';
import { recordNewHeartbeat } from '../controllers/';
import utils from './utils';

const Router = express.Router();

Router.post('/new', async (req: express.Request, res: express.Response) => {
    if (!utils.checkNewHeartbeatBody(req)) {
        return utils.errorResponse(res, 500, 'Missing required parameters.');
    }
    // Record existing installation heartbeat
    const result = await recordNewHeartbeat({
        installation_id: req.body.installation_id,
        app_name: req.body.app_name,
        app_version: req.body.app_version
    });
    if (!result) {
        return utils.errorResponse(res, 500, 'Something went wrong.');
    }
    return utils.successResponse(res, 'All good.');
});



export default Router;