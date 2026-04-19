import React, { useState } from 'react'
import toast from 'react-hot-toast';
import axios from "axios";
import { useAuthContext } from '../../hooks/useAuthContext';
import './FlashCards.css'
const apiURL = import.meta.env.VITE_BACKEND_URL;

const CardComponent = ({id, name, imageUrl, description, onSuccessfulAction}) => {

  const { user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editDescription, setEditDescription] = useState(description || '');

  const deleteCard = async () => {
    try {
      if(user) {
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        };
        const response = await axios.delete(`${apiURL}/api/v1/card/delete/${id}`, config);
        if(response && response.status == 200) {
          toast.success("Card deleted successfully!!")
          if (onSuccessfulAction) onSuccessfulAction();
        }
      }
    } catch(error) {
      console.log(error);
      toast.error(error?.message);
    }
  }

  const saveChanges = async () => {
    try {
      if(user) {
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        };
        const response = await axios.put(
          `${apiURL}/api/v1/card/edit/${id}`, 
          { name: editName, description: editDescription },
          config
        );
        if(response && response.status == 200) {
          toast.success("Card updated successfully!!");
          setIsEditing(false);
          if (onSuccessfulAction) onSuccessfulAction();
        }
      }
    } catch(error) {
      console.log(error);
      toast.error(error?.message || "Failed to update card");
    }
  };

  return (
    <div className="card__component">
      {isEditing ? (
        <div className="card__edit-form">
          <input 
            type="text" 
            value={editName} 
            onChange={(e) => setEditName(e.target.value)} 
            className="edit-input" 
            placeholder="Title"
          />
          <textarea 
            value={editDescription} 
            onChange={(e) => setEditDescription(e.target.value)} 
            className="edit-textarea"
            placeholder="Description"
          />
          <div className="edit-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
            <button onClick={saveChanges} className="save-btn">Save</button>
            <button onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <h2>{name.toUpperCase()}</h2>
          <img src={imageUrl} alt={name} />
          {description && <p className="card__description">{description}</p>}
          <div className="card-actions" style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <span onClick={() => setIsEditing(true)} style={{ cursor: 'pointer' }}>✏️</span>
            <span onClick={deleteCard} style={{ cursor: 'pointer' }}>🗑️</span>
          </div>
        </>
      )}
    </div>
  )
}

export default CardComponent;