import http from 'node:http'

export const createHttpServer = ({ app }) => http.createServer(app)
