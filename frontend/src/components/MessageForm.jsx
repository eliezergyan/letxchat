import React, { useContext, useState, useRef, useEffect } from 'react'
import Dropzone from 'react-dropzone';
import Axios from 'axios';
import { Form, Col, Row, Button } from 'react-bootstrap'
import { useSelector } from 'react-redux'
import {AppContext} from '../context/appContext';
import './MessageForm.css'

function MessageForm() {
    const [message, setMessage] = useState("");
    const user = useSelector((state) => state.user);
    const { socket, currentRoom, setMessages, messages, privateMemberMsg } = useContext(AppContext);
    const messageEndRef = useRef(null);


    useEffect(()=>{
        scrollToBottom();
    }, [messages])

    function getFormattedDate() {
        const date = new Date();
        const year = date.getFullYear();
        let month = (1+date.getMonth()).toString();

        month = month.length > 1 ? month : '0' + month
        let day = date.getDate().toString();

        day = day.length > 1 ? day : '0' + day;

        return month + "/" + day + "/" + year;  
    }


    function scrollToBottom(){
        messageEndRef.current?.scrollIntoView({behavior: 'smooth'})
    }

    const todayDate = getFormattedDate();

    socket.off("room-messages").on("room-messages", (roomMessages) => {
        setMessages(roomMessages);
    });

    function handleSubmit(e) {
        e.preventDefault() 
        if(!message) return;
        const today = new Date();
        const minutes = today.getMinutes() < 10 ? "0" + today.getMinutes() : today.getMinutes();
        const time = today.getHours() + ":" + minutes;
        const roomId = currentRoom;
        socket.emit("message-room", roomId, message, user, time, todayDate);
        setMessage("");
    }

    const onDrop = (files) => {
        let formData = new FormData;
        const config = {
            header: {'content-type': 'multipart/formdata'}
        }

        formData.append("file", files[0])
        Axios.post('http://localhost:5000/api/chat/uploadfiles', formData, config)
        .then(response => {
            if(response.data.success) {
                console.log(response.data.url)
                const today = new Date();
                const minutes = today.getMinutes() < 10 ? "0" + today.getMinutes() : today.getMinutes();
                const time = today.getHours() + ":" + minutes;
                const roomId = currentRoom;
                socket.emit("message-room", roomId, response.data.url, user, time, todayDate);
            }
        })
    }

     


    return (
        <>
            <div className="messages-output">
                {user && !privateMemberMsg?._id && <div className='alert alert-info'>You are in the {currentRoom} Chatroom</div>}
                {user && privateMemberMsg?._id && (
                    <>
                        <div className="alert alert-info conversation-info">
                            <div>
                                Your conversation with {privateMemberMsg.name} <img src={privateMemberMsg.picture} className='conversation-profile-picture' alt='profile'/>
                            </div>
                        </div>
                    </>
                )}
                {!user && <div className='alert alert-danger'>Please login</div>}

                {user && messages.map(({_id: date, messagesByDate}, idx) => (
                    <div key={idx}>
                        <p className='alert alert-info text-center message-date-indicator'>{date}</p>
                        {messagesByDate?.map(({content, time, from: sender}, msgIdx) => (
                            <div className={sender?.email === user?.email ? "message" : "incoming-message"} key={msgIdx}>
                                <div className='message-inner'>
                                    <div className='d-flex align-items-center mb-3'>
                                        <p className='message-sender'>{sender._id === user?._id? "You" : sender.username}</p>
                                    </div>
                                    <div className='message-content'>
                                    <div>
                                    {  
                                        content.replace('\\', '/').substring(0, 8) === "uploads/"?
                                        content.replace('\\', '/').substring(content.length - 3, content.length) === 'mp4'?
                                        <video 
                                        style={{maxWidth:'200px'}}
                                        src={`https://letxchatapp.herokuapp.com/${content}`} 
                                        alt='video' type="video/mp4" controls/>
                                        :
                                        <img 
                                        style={{maxWidth:'200px'}}
                                        src={`https://letxchatapp.herokuapp.com/${content}`} alt='img'/>
                                        :
                                        <p>{content}</p>  
                                    }
                                    <p className='message-timestamp-left'>{time}</p> 
                                    </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div ref={messageEndRef}/>
            </div>
                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={10}>
                            <Form.Group>
                                <Form.Control type="text" placeholder="Your message" disabled={!user} value={message} onChange={(e)=> setMessage(e.target.value)}></Form.Control>
                            </Form.Group>
                        </Col>
                        <Col md={1}>
                        <Dropzone onDrop={onDrop}>
                            {({getRootProps, getInputProps}) => (
                                <section>
                                <div {...getRootProps()}>
                                    <input {...getInputProps()} />
                                    <Button style={{width:'100%', backgroundColor:'orange'}} disabled={!user}>
                                        <i className="fa fa-upload" aria-hidden="true"></i>
                                    </Button>
                                </div>
                                </section>
                            )}
                        </Dropzone>
                        </Col>
                        <Col md={1}>
                            <Button variant="primary" type="submit" style={{width:'100%', backgroundColor:'orange'}} disabled={!user}>
                                <i className='fas fa-paper-plane'></i>
                            </Button>
                        </Col>
                    </Row>
                </Form>
        </>
    )
}

export default MessageForm