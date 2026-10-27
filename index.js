import  express from 'express'
import pg from 'pg'
import Joi from 'joi'

const app = express()
const port = process.env.PORT 
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mahasiswa',
    password: '1234', //sesuaikan password masing-
    port: 5432,
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))


//Middleware Logging
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        })
    })
    next();
})
// Response Envelpoe
function successResponse(res, message, data, status = 200) {
    return res.status(status).json({
        success: true, message, data, error: null,
    })
}

function errorResponse(res, message, data, status = null) {
    return res.status(status).json({
        success: false, message, data, error: details,
    })
}
