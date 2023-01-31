import { addNewDemographicsInfo, updateDemographicsInfoByIp, getMissingRecords } from './demographics/demographic.model';
import { addNewInstallation, countInstallations, findInstallationsByAppName } from './installations/installation.model';

export {
    addNewDemographicsInfo,
    updateDemographicsInfoByIp,
    getMissingRecords as getMissingDemographicRecords,
    addNewInstallation,
    findInstallationsByAppName,
    countInstallations
};