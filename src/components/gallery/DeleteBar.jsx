import React from 'react';

function DeleteBar({ itemCount, onDelete, onCancel }) {
  return (
    <div className="delete-bar">
      <button onClick={onDelete}>
        Delete {itemCount} items
      </button>
      <button onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export default DeleteBar; 