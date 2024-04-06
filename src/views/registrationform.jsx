import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './home.css';
import axios from 'axios';

const RegistrationForm = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const navigate = useNavigate();
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    const [isRegistrationVisible, setIsRegistrationVisible] = useState(false);
    const [isLoginVisible, setIsLoginVisible] = useState(true);

    const handleSwitchToRegistration = () => {
        setIsRegistrationVisible(true);
        setIsLoginVisible(false);
    };

    const handleSwitchToLogin = () => {
        setIsRegistrationVisible(false);
        setIsLoginVisible(true);
    };

    const validate = () => {
        let errors = {};
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

        if (!formData.username.match(/^[A-Za-z]+$/)) {
            errors.username = "First Name should contain only letters";
        }

        if (!regex.test(formData.email)) {
            errors.email = "Invalid email format";
        }

        if (formData.password.length < 8) {
            errors.password = "Password must be at least 8 characters";
        }

        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = "Passwords do not match";
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    const validateLogin = () => {
        let errors = {};
        if (formData.username.length === 0) {
            errors.username = "Username is required";
        }
        if (!formData.username.match(/^[A-Za-z]+$/)) {
            errors.username = "First Name should contain only letters";
        }
        if (formData.password.length < 8) {
            errors.password = "Password must be at least 8 characters";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const fd = new FormData();
    const handleSignup = (e) => {
        e.preventDefault();
        if (validate()) {
            console.log("Form submitted", formData);
            fd.append('username', formData.username);
            fd.append('email', formData.email);
            fd.append('password', formData.password);
            axios.post(process.env.REACT_APP_SERVER_IP + '/register', fd)
                .then(response => {
                    // Handle successful response
                    console.log(response.data);
                    setIsRegistrationVisible(false);
                    setIsLoginVisible(true);
                })
                .catch(error => {
                    // Handle error
                    console.error(error);
                });
        }
    };
    const handleSignin = (e) => {
        e.preventDefault();

        if (validateLogin()) {
            console.log("Form submitted", formData);
            console.log("ffffffddd", fd);
            fd.append('username', formData.username);
            fd.append('password', formData.password);
            axios.post(process.env.REACT_APP_SERVER_IP + '/login', fd)
                .then(response => {
                    // Handle successful response
                    console.log(response.data);
                    navigate('/home', { state: { ...formData } });
                })
                .catch(error => {
                    alert("Incorrect username or password");
                    console.error(error);
                });

        }
    };



    return (
        <div className='b'>
            {isRegistrationVisible && (
                <Container className='m-auto p-5 d-flex justify-content-center align-items-center card'>
                    <Row>
                        <Col>
                            <Form onSubmit={handleSignup}>
                                <Form.Group>
                                    <Form.Label className='text-white bolder'>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                    />
                                    {formErrors.username && <p style={{ color: 'red' }}>{formErrors.username}</p>}
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label className='text-white bolder'>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                    {formErrors.email && <p style={{ color: 'red' }}>{formErrors.email}</p>}
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label className='text-white bolder'>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    {formErrors.password && <p style={{ color: 'red' }}>{formErrors.password}</p>}
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label className='text-white bolder'>Confirm Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    {formErrors.confirmPassword ? (
                                        <p style={{ color: 'red' }}>
                                            <i>{formErrors.confirmPassword}</i>
                                        </p>
                                    ) : null}
                                </Form.Group>
                                <div className='my-3 text-center'>
                                    <Button type="submit">Register</Button>
                                </div>
                                {isRegistrationVisible && (
                                    <a onClick={handleSwitchToLogin}>Already have an account? Login here.</a>
                                )}
                            </Form>
                        </Col>
                    </Row>
                </Container>
            )}

            {isLoginVisible && (
                <Container className='m-auto p-5 d-flex justify-content-center align-items-center card'>
                    <Row>
                        <Col>
                            <Form onSubmit={handleSignin}>
                            <Form.Group>
                                    <Form.Label className='text-white bolder'>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                    />
                                    {formErrors.username && <p style={{ color: 'red' }}>{formErrors.username}</p>}
                                </Form.Group>
                                <Form.Group>
                                    <Form.Label className='text-white bolder'>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                    />
                                    {formErrors.password && <p style={{ color: 'red' }}>{formErrors.password}</p>}
                                </Form.Group>
                                <div className='my-3 text-center'>
                                    <Button type="submit">Login</Button>
                                </div>
                                {isLoginVisible && (
                                    <a onClick={handleSwitchToRegistration}>Do not have an account? Register here.</a>
                                )}
                            </Form>
                        </Col>
                    </Row>
                </Container>
            )}
        </div>
    );
};

export default RegistrationForm;
