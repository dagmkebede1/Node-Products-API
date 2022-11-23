const multer = require('multer')

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cd(null, './uploads')
    },
    filename: function(req, file, cb){
        cd(null, new Date().toString() + file.originalname);
    }
})
const fileFilter = function(req, file, cd){
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null, true)
    }else{
        cd(null, false)
    }
}

const upload = multer({storage: storage, limits: {fieldSize: 1024*1024*5}, fileFilter: fileFilter})


const imageHanddler = upload.single()


module.exports = imageHanddler