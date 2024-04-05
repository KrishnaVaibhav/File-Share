import React , {useState} from 'react';
import { useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './home.css';
import { FileUploader } from "react-drag-drop-files";
import { useNavigate } from "react-router-dom";
import 'bootstrap-icons/font/bootstrap-icons.css';
import axios from 'axios';

const Profile = () => {
    const location = useLocation();
    const {username, email, password, confirmPassword  } = location.state || {};
    const fileTypes = ["JPEG", "PNG", "GIF", "PDF", "DOC", "DOCX", "TXT", "CSV", "MP3", "MP4", "ZIP", "RAR"];
    const [file, setFile] = useState(null);
    const handleChange = (file) => {
      setFile(file);
    };
    const [link, setLink] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    console.log("State Variables", username, email, password, confirmPassword);
    const fd = new FormData();
    const redirect = () => {
        fd.append("username", username);
        axios.post("http://0.0.0.0:5000/subscribe", fd)
            .then(response => {
            alert(response.data.message);
            })
            .catch(error => {
            console.error(error);
            });
    };
    const handleSubmit = async () => {
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("username", username);

            try {
                setUploading(true); // Set uploading state to true

                const response = await fetch("http://0.0.0.0:5000/file", {
                    method: "POST",
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    setLink(data.presigned_url);
                    setUploadComplete(true); // Set uploadComplete state to true
                } else {
                    console.error("Upload failed");
                }
            } catch (error) {
                console.error("Error occurred during upload:", error);
            } finally {
                setUploading(false); // Set uploading state back to false
            }
        } else {
            console.error("No file selected");
        }
    };

    return (
        <div className='container home p-5 text-center card'>
            <FileUploader
                multiple={false}
                handleChange={handleChange}
                name="file"
                types={fileTypes}
                classes="drop_area"
            />
            <p>{file ? `File name: ${file.name}` : "no file uploaded yet"}</p>

            {/* https://www.npmjs.com/package/react-drag-drop-files */}
            <button className="btn btn-primary" onClick={handleSubmit}>
                {uploading ? "Uploading..." : "Upload"}
            </button>
            {uploadComplete && <p>Upload complete</p>}
            <div className="copy-box my-5">
                <div className='d-flex'>
                    <button
                        className="btn btn-primary copy-button"
                        onClick={() => {
                            navigator.clipboard.writeText(link ? link : "");
                        }}
                    >
                        <i className="bi bi-copy"></i>
                    </button>
                    <input className='form-control' type="text" value={link ? link : ""} readOnly />
                </div>
                <p>Share the link to share your file.</p>
            </div>
            <div>
                <button className="btn btn-primary" onClick={redirect}>
                    Enable Email Notification
                </button>
            </div>
        </div>
    );
};  
export default Profile;
