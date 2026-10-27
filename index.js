import  express from 'express'
import pg from 'pg'
import Joi from 'joi'

const app = express()
const port = process.env.PORT 
const { Pool } = pg;

