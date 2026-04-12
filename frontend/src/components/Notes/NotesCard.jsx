import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { AiFillDelete } from "react-icons/ai";
import { LuClipboardEdit } from "react-icons/lu";
import { FaRegEye } from "react-icons/fa";
import { MdQuiz } from "react-icons/md";
import { useAuthContext } from '../../hooks/useAuthContext';
import NotesPreview from './NotesPreview';
import './Notes.css'
const apiURL = import.meta.env.VITE_BACKEND_URL;

const NotesCard = ({ id, title, content, refreshNotes }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isQuizLoading, setIsQuizLoading] = useState(false);

  const { user } = useAuthContext();

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

     const handleDelete = async() => {
      try {
				if (user && id) {
					const config = {
						headers: {
						  Authorization: `Bearer ${user?.accessToken}`,
						},
					  };
					const response = await axios.delete(`${apiURL}/api/v1/note/delete/${id}`, config);
					if(response && response.status ===200) {
						toast.success("Deleted successfully");
						if (refreshNotes) {
							refreshNotes();
						}
					}
				}
			} catch (error) {
				console.log(error);
				toast.error(error?.message);
			}
    }

    const handleEdit = () => {
      setIsEditing(true);
      openModal();
    }

    const handleTakeQuiz = async () => {
      if (isQuizLoading) {
        toast.info('Quiz generation is already in progress. Please wait.');
        return;
      }

      setIsQuizLoading(true);
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        };
        
        const response = await axios.post(
          `${apiURL}/api/v1/quiz/create`,
          {
            noteId: id,
            quizType: 'multiple-choice',
            questionCount: 5
          },
          config
        );

        if (response.data.quiz) {
          toast.success('Quiz generated! Starting now...');
          window.location.href = `/quiz/take/${response.data.quiz._id}`;
        }
      } catch (error) {
        console.error('Error generating quiz:', error);
        console.error('Error response:', error.response?.data);
        const backendMessage = error?.response?.data?.message;
        const backendDetail = error?.response?.data?.error || error?.response?.data?.details;
        if (error?.response?.status === 429) {
          toast.error('Too many requests. Please wait a moment and try again.');
        } else if (backendDetail) {
          toast.error(`${backendMessage || 'Failed to generate quiz'}: ${backendDetail}`);
        } else {
          toast.error(backendMessage || error?.message || 'Failed to generate quiz');
        }
      } finally {
        setIsQuizLoading(false);
      }
    }

      return (
        <div className="note__card">
          <div className="note__text">
            <h2>{title?.toUpperCase()}</h2>
            <p>{content?.substring(0, 50)}</p>
          </div>
          <div className="note__icons">
            <div onClick={openModal}><FaRegEye cursor={'pointer'} title="View" /></div>
            <div onClick={handleEdit}><LuClipboardEdit cursor={'pointer'} title="Edit" /></div>
            <div onClick={handleTakeQuiz} style={{ cursor: isQuizLoading ? 'not-allowed' : 'pointer', opacity: isQuizLoading ? 0.6 : 1 }}>
              <MdQuiz cursor={'pointer'} title={isQuizLoading ? 'Quiz is generating...' : 'Take Quiz'} style={{color: '#667eea', fontSize: '1.2em'}} />
            </div>
            <span onClick={handleDelete}><AiFillDelete cursor={'pointer'} title="Delete" /></span>
          </div>
          <NotesPreview isOpen={modalIsOpen} closeModal={closeModal} id={id} title={title} content={content} isEditing={isEditing} setIsEditing={setIsEditing} refreshNotes={refreshNotes}/>
        </div>
      );
}

export default NotesCard