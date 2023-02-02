import express from 'express';
import heartbeatRoute from './heartbeat.route';
import installationRoute from './installation.route';
import dataRoute from './data.route';

const Router = express.Router();

Router.use('/installation/', installationRoute);
Router.use('/heartbeat/', heartbeatRoute);
Router.use('/data', dataRoute);


export default Router;