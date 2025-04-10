import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script (backend/src/api folder)
const __apiDir = path.dirname(fileURLToPath(import.meta.url));
// Get the backend directory (one level up from api)
const __backendDir = path.resolve(__apiDir, '..');
// Get the root project directory
const __projectRoot = path.resolve(__backendDir, '..', '..'); 

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store scraping job status
const scrapingJobs = {};

// API Routes
app.post('/api/scrape-academic-record', (req, res) => {
  const jobId = Date.now().toString();
  
  // Set initial job status
  scrapingJobs[jobId] = {
    status: 'running',
    message: 'Starting academic record scraper...',
    started: new Date(),
    completed: null,
    result: null,
    log: ""
  };
  
  console.log(`Starting scraping job ${jobId}`);
  
  // Define path to the Python script within the scrapers folder
  const scriptPath = path.join(__backendDir, 'scrapers', 'ScrapeCourses.py');
  // Define path to the virtual environment python executable relative to project root
  const pythonExecutable = path.join(__projectRoot, '.venv', 'bin', 'python');
  
  // Run the Python scraper using the virtual environment's python
  // const pythonProcess = spawn(pythonExecutable, [scriptPath], { cwd: __backendDir }); // Run from backend dir
  // let scriptOutput = "";
  // let scriptError = "";
  
  // pythonProcess.stdout.on('data', (data) => {
  //   const output = data.toString();
  //   console.log(`Scraper stdout: ${output}`);
  //   scriptOutput += output;
  //   scrapingJobs[jobId].log += output;
  //   // Update message with the latest line of output
  //   const lines = output.trim().split('\n');
  //   if (lines.length > 0) {
  //       scrapingJobs[jobId].message = lines[lines.length - 1];
  //   }
  // });
  
  // pythonProcess.stderr.on('data', (data) => {
  //   const errorOutput = data.toString();
  //   console.error(`Scraper stderr: ${errorOutput}`);
  //   scriptError += errorOutput;
  //   scrapingJobs[jobId].log += `ERROR: ${errorOutput}`;
  //   scrapingJobs[jobId].message = `Scraper error occurred...`; // Update message on error
  // });
  
  // pythonProcess.on('close', (code) => {
  //   console.log(`Scraper exited with code ${code}`);
  //   scrapingJobs[jobId].log += `\n--- Process exited with code ${code} ---\n`;
  //   scrapingJobs[jobId].completed = new Date();
  
  //   // Define path to the output file within the backend folder
  //   const resultPath = path.join(__backendDir, 'user_completed_courses.json');
  
  //   if (code === 0) {
  //     try {
  //       // Read the results file
  //       if (fs.existsSync(resultPath)) {
  //         const fileData = fs.readFileSync(resultPath, 'utf8');
  //         const courses = JSON.parse(fileData);
  
  //         scrapingJobs[jobId].status = 'completed';
  //         scrapingJobs[jobId].message = `Successfully scraped ${courses.length} courses`;
  //         scrapingJobs[jobId].result = courses;
  //         scrapingJobs[jobId].log += "Results file processed successfully.\n";
  //       } else {
  //         scrapingJobs[jobId].status = 'failed';
  //         scrapingJobs[jobId].message = 'Scraper completed but results file not found';
  //         scrapingJobs[jobId].log += "ERROR: Results file (user_completed_courses.json) not found.\n";
  //       }
  //     } catch (error) {
  //       scrapingJobs[jobId].status = 'failed';
  //       scrapingJobs[jobId].message = `Error processing results file: ${error.message}`;
  //       scrapingJobs[jobId].log += `ERROR processing results file: ${error.message}\n`;
  //       console.error("Error processing results file:", error);
  //     }
  //   } else {
  //     scrapingJobs[jobId].status = 'failed';
  //     scrapingJobs[jobId].message = `Scraper failed with exit code ${code}. Check log for details.`;
  //     scrapingJobs[jobId].log += `Scraper script failed. Raw stderr output:\n${scriptError}`; // Include stderr in log
  //     console.error(`Scraper failed. Stderr: ${scriptError}`);
  //   }
  // });
  
  // pythonProcess.on('error', (err) => {
  //     console.error('Failed to start scraper process:', err);
  //     scrapingJobs[jobId].status = 'failed';
  //     scrapingJobs[jobId].message = `Failed to start Python process: ${err.message}`;
  //     scrapingJobs[jobId].log += `ERROR: Failed to start Python process: ${err.message}\n`;
  //     scrapingJobs[jobId].completed = new Date();
  //     // Respond immediately if process couldn't even start
  //      if (!res.headersSent) {
  //          res.status(500).json({
  //               jobId,
  //               status: 'failed',
  //               message: scrapingJobs[jobId].message
  //           });
  //      }
  // });
  
  // Return job ID immediately if process started
  // Check if headers are already sent prevents crashing if pythonProcess.on('error') responded first
   if (!res.headersSent) {
        res.json({
            jobId,
            status: 'running',
            message: 'Academic record scraper started'
        });
   }
});

// Check job status endpoint
app.get('/api/scrape-status/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  if (scrapingJobs[jobId]) {
    // Return a subset of data, potentially excluding the full result array until completed
    const { result, ...statusData } = scrapingJobs[jobId];
    if (statusData.status === 'completed') {
        res.json(scrapingJobs[jobId]); // Send full data on completion
    } else {
        res.json(statusData); // Send status without full results while running/failed
    }
  } else {
    res.status(404).json({
      error: 'Job not found'
    });
  }
});

// Get all completed courses endpoint
app.get('/api/academic-record', (req, res) => {
  try {
    // Define path to the output file within the data folder
    const resultPath = path.join(__backendDir, '..', 'data', 'user_completed_courses.json');
    if (fs.existsSync(resultPath)) {
      const data = fs.readFileSync(resultPath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({
        error: 'No academic record found',
        message: 'Please run the scraper first to retrieve your academic record'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to read academic record',
      message: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Academic scraper API running on port ${port}`);
  console.log(`Backend directory: ${__backendDir}`);
  console.log(`Project root: ${__projectRoot}`);
});

export default app; 