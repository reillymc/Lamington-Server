interface LamingtonResponse {
    error: boolean,
    message?: string,
}

interface LamingtonDataResponse<T> extends LamingtonResponse {
    data?: T,
}


export { LamingtonResponse, LamingtonDataResponse }