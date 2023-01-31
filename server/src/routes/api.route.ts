import express from 'express';
import heartbeatRoute from './heartbeat.route';
import installationRoute from './installation.route';

const Router = express.Router();

Router.use('/installation/', installationRoute);
Router.use('/heartbeat/', heartbeatRoute);


export default Router;