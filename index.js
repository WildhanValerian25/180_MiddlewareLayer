import express from 'express'
import pg from 'pg'
import Joi from 'joi'

const app = express()
const port = process.env.PORT || 3000
const { Pool } = pg

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mahasiswa',
    password: '1234', // sesuaikan password masing-masing
    port: 5432,
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Middleware Logging
app.use((req, res, next) => {
    const start = Date.now()

    res.on('finish', () => {
        const duration = Date.now() - start
        console.log({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
        })
    })
    next()
})

// Response Envelope
function successResponse(res, message, data = null, status = 200) {
    return res.status(status).json({
        success: true, message, data, error: null,
    })
}

function errorResponse(res, message, status = 500, details = null) {
    return res.status(status).json({
        success: false, message, data: null, error: details,
    })
}

// Joi Validation Schema
const biodataSchema = Joi.object({
    nama: Joi.string().trim().min(2).max(100).required(),
    nim: Joi.string().trim().min(5).max(20).required(),
    kelas: Joi.string().trim().min(1).max(20).required(),
})

const idSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
})

// Middleware untuk validasi body
function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body ?? {}, {
            abortEarly: false, convert: true, allowUnknown: false,
        })
        if (error) {
            return errorResponse(
                res,
                'Validasi Input Gagal',
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message,
                }))
            )
        }
        req.body = value
        next()
    }
}

// Middleware untuk validasi parameter ID
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, { abortEarly: false })
        if (error) {
            return errorResponse(
                res,
                'Parameter tidak valid',
                400,
                error.details.map(item => ({
                    field: item.path.join('.'),
                    message: item.message,
                }))
            )
        }
        req.params = value
        next()
    }
}

// Route sambutan
app.get('/', (req, res) => {
    return successResponse(res, 'API Biodata Mahasiswa berjalan')
})

// GET semua data
app.get('/biodata', async (req, res) => {
    const result = await pool.query('SELECT * FROM biodata ORDER BY id')
    return successResponse(res, 'Data berhasil diambil', result.rows)
})

// POST tambah data
app.post('/biodata', validateBody(biodataSchema), async (req, res) => {
    const { nama, nim, kelas } = req.body
    const result = await pool.query(
        'INSERT INTO biodata (nama, nim, kelas) VALUES ($1, $2, $3) RETURNING *',
        [nama, nim, kelas]
    )
    return successResponse(res, 'Data berhasil ditambahkan', result.rows[0], 201)
})

// PUT ubah data
app.put(
    '/biodata/:id',
    validateParams(idSchema),
    validateBody(biodataSchema),
    async (req, res) => {
        const { id } = req.params
        const { nama, nim, kelas } = req.body

        const result = await pool.query(
            'UPDATE biodata SET nama=$1, nim=$2, kelas=$3 WHERE id=$4 RETURNING *',
            [nama, nim, kelas, id]
        )
        if (result.rowCount === 0) {
            return errorResponse(res, 'Data tidak ditemukan', 404)
        }
        return successResponse(res, 'Data berhasil diperbarui', result.rows[0])
    }
)

// DELETE hapus data
app.delete('/biodata/:id', validateParams(idSchema), async (req, res) => {
    const { id } = req.params
    const result = await pool.query(
        'DELETE FROM biodata WHERE id=$1 RETURNING *',
        [id]
    )
    if (result.rowCount === 0) {
        return errorResponse(res, 'Data tidak ditemukan', 404)
    }
    return successResponse(res, 'Data berhasil dihapus', result.rows[0])
})

// Jika route tidak ditemukan
app.use((req, res) => {
    return errorResponse(res, 'Endpoint tidak ditemukan', 404)
})

// Global error handler
app.use((err, req, res, next) => {
    console.error(err)
    if (res.headersSent) {
        return next(err)
    }
    // JSON body rusak
    if (err.type === 'entity.parse.failed') {
        return errorResponse(res, 'Format JSON tidak valid', 400)
    }
    // NIM duplikat (unique violation PostgreSQL)
    if (err.code === '23505') {
        return errorResponse(res, 'NIM atau ID sudah terdaftar', 409)
    }
    return errorResponse(res, 'Terjadi kesalahan pada server', 500)
})

app.listen(port, () => {
    console.log(`App running on port ${port}.`)
})