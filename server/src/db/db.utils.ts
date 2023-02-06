import { IDatabaseResponse } from './db.interface';

const constructDatabaseErrorResponse = (error: any): IDatabaseResponse => {
  return {
    success: false,
    errorMessage: error.errors[0].message,
    data: error,
  };
};

const constructDatabaseSuccessResponse = (
  values: object | null | number,
): IDatabaseResponse => {
  return {
    success: true,
    values: values,
  };
};

export default {
  constructDatabaseErrorResponse,
  constructDatabaseSuccessResponse,
};
