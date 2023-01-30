import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import { Server } from 'http';
import routes from './routes';
const PORT = 1234;
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.resolve(path.join(__dirname, '..', 'public'))));
app.use('/', routes);

let service: Server | null = null;

/* istanbul ignore if */
if (require.main === module) {

    service = app.listen(PORT, '0.0.0.0', () => {
        console.info(`Service is listening on port ${PORT}.`);
    });
    const closeGracefully = async (signal: NodeJS.Signals) => {
        console.warn(`^!@4=> Received signal to terminate: ${signal}`);
        service?.close(err => process.exit());
        // await sequelize.close();
    };
    process.on('SIGINT', closeGracefully);
    process.on('SIGTERM', closeGracefully);
}

export default {
    service,
    app
};