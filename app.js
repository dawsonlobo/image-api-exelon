const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost/image-api', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));

// Define Schema and Model for storing images in MongoDB
const ImageSchema = new mongoose.Schema({
    filename: String,
    data: Buffer
});

const Image = mongoose.model('Image', ImageSchema);

// Multer storage configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Resize, change quality, and format the image
const processImage = async (buffer, options) => {
    let image = sharp(buffer);

    if (options.width && options.height) {
        image = image.resize(options.width, options.height);
    }

    if (options.quality && options.format === 'jpeg') {
        image = image.jpeg({ quality: options.quality });
    }

    if (options.format === 'png') {
        image = image.png({ quality: options.quality });
    }

    if (options.format === 'webp') {
        image = image.webp({ quality: options.quality });
    }

    // Add additional format handling as needed

    return await image.toBuffer();
};



// API endpoint to handle image processing
app.post('/processImage', upload.single('image'), async (req, res) => {
    const { width, height, quality, format } = req.body;
    const buffer = req.file.buffer;

    const options = {
        width: parseInt(width, 10), // Parse width as integer
        height: parseInt(height, 10), // Parse height as integer
        quality: parseInt(quality, 10), // Parse quality as integer
        format: format
    };


    try {
        const processedBuffer = await processImage(buffer, options);

        // Save processed image to MongoDB with specified format
        const filename = `${req.file.originalname.split('.')[0]}.${options.format}`; // Construct filename with specified format
        const image = new Image({
            filename: filename,
            data: processedBuffer
        });
        await image.save();

        // Return URL to view the processed image
        const imageUrl = `${req.protocol}://${req.get('host')}/images/${image._id}`;
        res.send(`Processed image saved successfully! View it at: ${imageUrl}`);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).send('Error processing image');
    }
});

// Endpoint to view processed image
app.get('/images/:id', async (req, res) => {
    const imageId = req.params.id;

    try {
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).send('Image not found');
        }

        // Set appropriate Content-Type header based on image format
        const contentType = `image/${image.filename.split('.').pop()}`;
        res.set('Content-Type', contentType);
        res.send(image.data);
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).send('Error fetching image');
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
