import express from 'express';
import { recordNewDeployment } from '../controllers/';
import utils from './utils';

const Router = express.Router();

Router.post('/new', async (req: express.Request, res: express.Response) => {
    if (!utils.checkNewInstallationBody(req)) {
        return utils.errorResponse(res, 500, 'Missing required parameters.');
    }
    const previousInstallationId = req.body.previous_installation_id === undefined ? null : req.body.previous_installation_id;
    // Record new installation
    const result = await recordNewDeployment(req.body.app_name, req.body.app_version, req.socket.remoteAddress, previousInstallationId);
    if (result === false) {
        return utils.errorResponse(res, 500, 'Something went wrong.');
    }
    return utils.successResponse(res, "All good.", { id: (result as { id: string; }).id });
});

export default Router;