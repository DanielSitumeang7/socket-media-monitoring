const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const mysql = require('mysql')
const cors = require('cors')

const app = express()
app.use(cors())
const server = http.createServer(app)
const io = socketIo(
    server, {
    cors: {
        origin: "http://103.116.168.189",
        methods: ["GET", "POST"]
    }
}
)

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1crqDVhbS6dv501MUDVUsE5pNV2MLEotbk61Nw7ljZSDR8CCyT',
    database: 'db_media_monitoring'
}

const db = mysql.createConnection(dbConfig)

db.connect((err) => {
    if (err) throw err
    console.log('Database connected')

    io.on('connection', (socket) => {
        console.log('User connected')

        socket.on('disconnect', () => {
            console.log('User disconnected')
        })
    })
})

app.use(express.json())

app.get('/statistik-content/:projectId', (req, res) => {
    console.log('Request dari client diterima')
    const projectId = req.params.projectId
    const tanggalHariIni = new Date().toISOString().split('T')[0]
    const tanggalMingguLalu = new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split('T')[0]
    const tahunIni = new Date().toISOString().split('-')[0]
    const bulanIni = new Date().toISOString().split('-')[1]

    console.log(tanggalMingguLalu)

    let arrayTanggalSemingguLalu = []
    for (let i = 0; i < 7; i++) {
        arrayTanggalSemingguLalu.push(new Date(new Date().setDate(new Date().getDate() - i)).toISOString().split('T')[0])
    }

    const queryHarian = `SELECT all_dates.date, COALESCE(SUM(CASE WHEN sentiments.name = 'Negatif' THEN 1 ELSE 0 END), 0) AS negatif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Positif' THEN 1 ELSE 0 END), 0) AS positif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Netral' THEN 1 ELSE 0 END), 0) AS netral_count FROM (SELECT ${arrayTanggalSemingguLalu[0]} AS date UNION SELECT '${arrayTanggalSemingguLalu[1]}' UNION SELECT '${arrayTanggalSemingguLalu[2]}' UNION SELECT '${arrayTanggalSemingguLalu[3]}' UNION SELECT '${arrayTanggalSemingguLalu[4]}' UNION SELECT '${arrayTanggalSemingguLalu[5]}' UNION SELECT '${arrayTanggalSemingguLalu[6]}') AS all_dates LEFT JOIN contents ON contents.date = all_dates.date LEFT JOIN sentiments ON contents.sentiment_id = sentiments.id WHERE all_dates.date BETWEEN '${tanggalMingguLalu}' AND '${tanggalHariIni}' GROUP BY all_dates.date;`

    const queryMingguan = `SELECT CONCAT('Minggu ', WEEK(all_dates.date)) AS week_of_month, COALESCE(SUM(CASE WHEN sentiments.name = 'Negatif' THEN 1 ELSE 0 END), 0) AS negatif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Positif' THEN 1 ELSE 0 END), 0) AS positif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Netral' THEN 1 ELSE 0 END), 0) AS netral_count FROM (SELECT DATE('${tahunIni}-${bulanIni}-01') + INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY AS date FROM (SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) AS a CROSS JOIN ( SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 ) AS b  CROSS JOIN ( SELECT 0 AS a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4  UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 ) AS c) AS all_dates LEFT JOIN contents ON all_dates.date = contents.date LEFT JOIN sentiments ON contents.sentiment_id = sentiments.id WHERE all_dates.date BETWEEN '${tahunIni}-${bulanIni}-01' AND '${tanggalHariIni}' AND WEEK(all_dates.date) <= 4 GROUP BY CONCAT('Minggu ', WEEK(all_dates.date));`

    const queryTahunan = `SELECT MONTH(all_dates.date) AS month, COALESCE(SUM(CASE WHEN sentiments.name = 'Negatif' THEN 1 ELSE 0 END), 0) AS negatif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Positif' THEN 1 ELSE 0 END), 0) AS positif_count, COALESCE(SUM(CASE WHEN sentiments.name = 'Netral' THEN 1 ELSE 0 END), 0) AS netral_count FROM (SELECT '${tahunIni}-01-01' AS date UNION SELECT '${tahunIni}-02-01' UNION SELECT '${tahunIni}-03-01' UNION SELECT '${tahunIni}-04-01' UNION SELECT '${tahunIni}-05-01' UNION SELECT '${tahunIni}-06-01' UNION SELECT '${tahunIni}-07-01' UNION SELECT '${tahunIni}-08-01' UNION SELECT '${tahunIni}-09-01' UNION SELECT '${tahunIni}-10-01' UNION SELECT '${tahunIni}-11-01' UNION SELECT '${tahunIni}-12-01') AS all_dates LEFT JOIN contents ON MONTH(contents.date) = MONTH(all_dates.date) LEFT JOIN sentiments ON contents.sentiment_id = sentiments.id WHERE all_dates.date BETWEEN '${tahunIni}-01-01' AND '${tahunIni}-12-31' GROUP BY MONTH(all_dates.date);`

    const executeQueryHarian = db.query(queryHarian)
    const queryHarianWathcer = executeQueryHarian.stream()
    queryHarianWathcer.on('data', (chunk) => {
        io.emit('statistikContentHarian', chunk)
    })

    const executeQueryMingguan = db.query(queryMingguan)
    const queryMingguanWathcer = executeQueryMingguan.stream()
    queryMingguanWathcer.on('data', (chunk) => {
        io.emit('statistikContentMingguan', chunk)
    })

    const executeQueryTahunan = db.query(queryTahunan)
    const queryTahunanWathcer = executeQueryTahunan.stream()
    queryTahunanWathcer.on('data', (chunk) => {
        io.emit('statistikContentTahunan', chunk)
    })

    db.query(queryHarian, (err, resultHarian) => {
        if (err) {
            console.log(err)
            return res.status(500
            ).send(err)
        }

        db.query(queryMingguan, (err, resultMingguan) => {
            if (err) {
                console.log(err)
                return res.status(500).send(err)
            }

            db.query(queryTahunan, (err, resultTahunan) => {
                if (err) {
                    console.log(err)
                    return res.status(500
                    ).send(err)
                }

                res.status(200).send({
                    data : {
                        harian: resultHarian,
                        mingguan: resultMingguan,
                        bulanan: resultTahunan
                    },
                    message : 'Data berhasil diambil',
                    status : 200
                })
            }
            )
        }
        )
    }
    )

})

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});

