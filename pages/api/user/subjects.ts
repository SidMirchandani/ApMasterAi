
import { NextApiRequest, NextApiResponse } from 'next';
import { storage } from '../../../server/storage';
import { verifyAuthToken } from '../../../server/firebase-admin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyAuthToken(token);
    
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const userId = decodedToken.uid;

    switch (req.method) {
      case 'GET':
        try {
          const subjects = await storage.getUserSubjects(userId);
          return res.status(200).json({
            success: true,
            data: subjects
          });
        } catch (error) {
          console.error('Error fetching subjects:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch subjects'
          });
        }

      case 'POST':
        try {
          const subject = req.body;
          if (!subject.name) {
            return res.status(400).json({
              success: false,
              message: 'Subject name is required'
            });
          }

          const newSubject = await storage.addUserSubject(userId, subject);
          return res.status(201).json({
            success: true,
            data: newSubject
          });
        } catch (error) {
          console.error('Error adding subject:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to add subject'
          });
        }

      case 'PUT':
        try {
          const subject = req.body;
          if (!subject.id) {
            return res.status(400).json({
              success: false,
              message: 'Subject ID is required'
            });
          }

          const updatedSubject = await storage.updateUserSubject(userId, subject);
          return res.status(200).json({
            success: true,
            data: updatedSubject
          });
        } catch (error) {
          console.error('Error updating subject:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to update subject'
          });
        }

      case 'DELETE':
        try {
          const { subjectId } = req.query;
          if (!subjectId || typeof subjectId !== 'string') {
            return res.status(400).json({
              success: false,
              message: 'Subject ID is required'
            });
          }

          await storage.deleteUserSubject(userId, subjectId);
          return res.status(200).json({
            success: true,
            message: 'Subject deleted successfully'
          });
        } catch (error) {
          console.error('Error deleting subject:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete subject'
          });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} not allowed`
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
