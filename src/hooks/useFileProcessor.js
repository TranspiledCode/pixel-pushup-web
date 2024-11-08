// src/hooks/useFileProcessor.js
import { useState } from 'react';

const useFileProcessor = ({
  files,
  processingMode,
  bucketLocation,
  exportType, // Receive exportType as a parameter
  setFileStatuses,
  setLoading,
  setMessage,
}) => {
  const [controllers, setControllers] = useState([]);

  const processFiles = () => {
    setLoading(true);
    setMessage('');

    const updatedStatuses = files.map((file) => ({
      name: file.name,
      status: 'pending',
      progress: 0,
      file: file,
    }));
    setFileStatuses(updatedStatuses);

    processAllFiles(files);
  };

  const processAllFiles = (fileInput) => {
    const controller = new AbortController();
    setControllers([controller]);

    const updatedStatuses = fileInput.map((file) => ({
      name: file.name,
      status: 'processing',
      progress: 0,
      file: file,
    }));
    setFileStatuses(updatedStatuses);

    const formData = new FormData();
    fileInput.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('Processing-Mode', processingMode);
    formData.append('Export-Type', exportType); // Append export type

    if (processingMode === 'aws') {
      formData.append('BucketLocation', bucketLocation);
    }

    fetch('http://localhost:5000/pushup', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          return processingMode === 'local' ? response.blob() : response.json();
        } else {
          return response.json().then((err) => {
            throw err;
          });
        }
      })
      .then((data) => {
        updatedStatuses.forEach((status) => {
          status.status = 'success';
          status.progress = 100;
        });
        setFileStatuses([...updatedStatuses]);

        if (processingMode === 'local') {
          const url = window.URL.createObjectURL(new Blob([data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `pixel-pushup-images.zip`);
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
        }
        setLoading(false);
        setMessage('Processing complete.');
      })
      .catch((error) => {
        // Replace with toast message or other error handling
        console.error('Error:', error);
        updatedStatuses.forEach((status) => {
          status.status = 'error';
        });
        setFileStatuses([...updatedStatuses]);
        setLoading(false);
        setMessage('Processing failed.');
      });
  };

  const cancelProcessing = () => {
    controllers.forEach((controller) => controller.abort());
    setLoading(false);
    setMessage('Processing canceled.');
  };

  return { processFiles, cancelProcessing, controllers };
};

export default useFileProcessor;
