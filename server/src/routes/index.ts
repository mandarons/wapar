import express from 'express';
import apiRoute from './api.route';

const Router = express.Router();

Router.use('/api/', apiRoute);

export default Router;
