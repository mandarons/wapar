import express from 'express';
import dataController from '../controllers/generate-data';
import utils from './utils';

const Router = express.Router();

Router.get('/', async (req: express.Request, res: express.Response) => {
    return utils.successResponse(res, 'All good.', await dataController.getAggregateData());
});

export default Router;