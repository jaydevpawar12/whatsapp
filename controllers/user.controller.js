const asyncHandler = require("express-async-handler");
const { profileUpload } = require("../utils/upload");
const User = require("./../models/User");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.updateProfile = asyncHandler(async (req, res) => {
    profileUpload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message || "Multer Error" });
        }

        const { auth } = req.cookies;
        if (!auth) {
            return res.status(401).json({ message: "No Cookie Found" });
        }

        jwt.verify(auth, process.env.JWT_KEY, async (err, decode) => {
            if (err) {
                return res.status(401).json({ message: err.message || "JWT ERROR" });
            }

            req.body.userId = decode.userId;
            const { userId, name, email, mobile, about } = req.body;
            const user = await User.findById(userId);

            if (req.file) {
                const uploadResult = await cloudinary.uploader.upload(req.file.path, {
                    folder: "profile_pictures",
                    public_id: `${userId}_profile`,
                    overwrite: true,
                });

                if (user.photo && user.photo !== "dummy.png" && user.photo.startsWith("http")) {
                    const publicId = user.photo.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
                }

                user.photo = uploadResult.secure_url;
            }


            user.name = name || user.name;
            user.email = email || user.email;
            user.mobile = mobile || user.mobile;
            user.about = about || user.about;

            const updatedProfile = await user.save();

            res.json({ message: "Profile Update Success", result: updatedProfile });
        });
    });
});

exports.searchProfile = asyncHandler(async (req, res) => {
    const { term } = req.params;
    const result = await User.find({
        $or: [
            { name: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
            { mobile: { $regex: term, $options: "i" } },
        ],
    });
    res.json({ message: "Search success", result });
});
