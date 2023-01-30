import express from 'express';
import { getAggregateData } from '../controllers/';
import utils from './utils';

const Router = express.Router();

Router.get('/', async (req: express.Request, res: express.Response) => {
    const data = await getAggregateData();
    return utils.successResponse(res, 'All good.', data as object);
});

export default Router;