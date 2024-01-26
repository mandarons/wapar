import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    let res = await fetch('https://wapar-api.mandarons.com/api/usage');
    const waparData = await res.json();
    res = await fetch('https://analytics.home-assistant.io/custom_integrations.json');
    const haData = await res.json();
    const data = { ...waparData };
    data.haBouncie = haData.bouncie;
    return data;
};
