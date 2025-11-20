"""
Flask REST API Server for Virtual Memory Implementor
Provides HTTP endpoints for web interface
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
from typing import Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core import (
    VirtualMemoryImplementor, SimulationConfig, PageReplacementAlgorithm,
    SimulationResult, SimulationStep
)

app = Flask(__name__, static_folder='../web', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Global implementor instance
implementor = VirtualMemoryImplementor()
current_result: Optional[SimulationResult] = None


def step_to_dict(step: SimulationStep) -> dict:
    """Convert SimulationStep to dictionary"""
    return {
        'timestamp': step.timestamp,
        'processId': step.process_id,
        'pageNumber': step.page_number,
        'event': step.event,
        'frameNumber': step.frame_number,
        'message': step.message,
        'physicalMemory': step.physical_memory,
        'pageTables': {str(k): v for k, v in step.page_tables.items()},
        'tlbState': step.tlb_state,
        'freeFrames': step.free_frames,
        'pageFaultCount': step.page_fault_count,
        'tlbHitCount': step.tlb_hit_count,
        'pageHitCount': step.page_hit_count,
        'thrashingDetected': getattr(step, 'thrashing_detected', False),
        'sharedFrames': {str(f): pids for f, pids in getattr(step, 'shared_frames', {}).items()}
    }


def result_to_dict(result: SimulationResult) -> dict:
    """Convert SimulationResult to dictionary"""
    return {
        'success': result.success,
        'errorMessage': result.error_message,
        'steps': [step_to_dict(step) for step in result.steps],
        'pageFaultCounts': {str(k): v for k, v in result.page_fault_counts.items()},
        'tlbHitCounts': {str(k): v for k, v in result.tlb_hit_counts.items()},
        'totalPageFaults': result.total_page_faults,
        'totalTlbHits': result.total_tlb_hits,
        'totalPageHits': result.total_page_hits,
        'totalReferences': result.total_references,
        'pageFaultRate': result.page_fault_rate,
        'tlbHitRate': result.tlb_hit_rate,
        'pageHitRate': result.page_hit_rate,
        'executionTime': result.execution_time,
        'thrashingDetected': any(
            getattr(step, 'thrashing_detected', False) for step in result.steps
        ) if result.steps else False
    }


@app.route('/')
def index():
    """Serve the enhanced web interface"""
    return send_from_directory(app.static_folder, 'index_enhanced.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Virtual Memory Implementor API',
        'version': '2.0.0'
    })


@app.route('/api/simulate', methods=['POST'])
def start_simulation():
    """
    Start a new simulation
    
    Request body:
    {
        "numProcesses": 4,
        "maxPagesPerProcess": 5,
        "numFrames": 8,
        "tlbSize": 4,
        "algorithm": "LRU",  // LRU, FIFO, or LFU
        "autoGenerate": true,
        "referenceStrings": [[...], [...]]  // Optional if autoGenerate is false
    }
    """
    global current_result
    
    try:
        data = request.get_json()
        
        # Parse algorithm
        algorithm_str = data.get('algorithm', 'LRU').upper()
        try:
            algorithm = PageReplacementAlgorithm[algorithm_str]
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Invalid algorithm: {algorithm_str}. Must be LRU, FIFO, or LFU'
            }), 400
        
        # Create configuration
        config = SimulationConfig(
            num_processes=data.get('numProcesses', 4),
            max_pages_per_process=data.get('maxPagesPerProcess', 5),
            num_frames=data.get('numFrames', 8),
            tlb_size=data.get('tlbSize', 4),
            algorithm=algorithm,
            auto_generate_references=data.get('autoGenerate', True),
            reference_strings=data.get('referenceStrings', None),
            enable_shared_memory=data.get('enableSharedMemory', False)
        )
        
        # Validate configuration
        if config.num_processes <= 0:
            return jsonify({'success': False, 'error': 'Number of processes must be positive'}), 400
        if config.num_frames < config.num_processes:
            return jsonify({'success': False, 'error': 'Number of frames must be >= number of processes'}), 400
        if config.tlb_size <= 0:
            return jsonify({'success': False, 'error': 'TLB size must be positive'}), 400
        
        # Configure and run simulation
        implementor.configure(config)
        current_result = implementor.run_simulation()
        
        if not current_result.success:
            return jsonify({
                'success': False,
                'error': current_result.error_message
            }), 500
        
        return jsonify(result_to_dict(current_result))
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Simulation error: {str(e)}'
        }), 500


@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current simulation status"""
    global current_result
    
    if current_result is None:
        return jsonify({
            'hasSimulation': False,
            'isRunning': implementor.is_running
        })
    
    return jsonify({
        'hasSimulation': True,
        'isRunning': implementor.is_running,
        'totalSteps': len(current_result.steps),
        'totalPageFaults': current_result.total_page_faults,
        'totalReferences': current_result.total_references,
        'pageFaultRate': current_result.page_fault_rate
    })


@app.route('/api/steps', methods=['GET'])
def get_all_steps():
    """Get all simulation steps"""
    global current_result
    
    if current_result is None:
        return jsonify({
            'success': False,
            'error': 'No simulation has been run'
        }), 404
    
    return jsonify({
        'success': True,
        'steps': [step_to_dict(step) for step in current_result.steps]
    })


@app.route('/api/steps/<int:step_index>', methods=['GET'])
def get_step(step_index: int):
    """Get a specific simulation step"""
    global current_result
    
    if current_result is None:
        return jsonify({
            'success': False,
            'error': 'No simulation has been run'
        }), 404
    
    if step_index < 0 or step_index >= len(current_result.steps):
        return jsonify({
            'success': False,
            'error': f'Invalid step index: {step_index}'
        }), 400
    
    step = current_result.steps[step_index]
    return jsonify({
        'success': True,
        'step': step_to_dict(step)
    })


@app.route('/api/result', methods=['GET'])
def get_result():
    """Get complete simulation result"""
    global current_result
    
    if current_result is None:
        return jsonify({
            'success': False,
            'error': 'No simulation has been run'
        }), 404
    
    return jsonify(result_to_dict(current_result))


@app.route('/api/reset', methods=['POST'])
def reset_simulation():
    """Reset the simulation"""
    global current_result
    
    implementor.reset()
    current_result = None
    
    return jsonify({
        'success': True,
        'message': 'Simulation reset successfully'
    })


@app.route('/api/algorithms', methods=['GET'])
def get_algorithms():
    """Get available page replacement algorithms"""
    return jsonify({
        'algorithms': [algo.value for algo in PageReplacementAlgorithm]
    })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


def main():
    """Main entry point"""
    print("=" * 60)
    print("Virtual Memory Implementor - REST API Server")
    print("=" * 60)
    print(f"Starting server on http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=5000, debug=True, threaded=True)


if __name__ == '__main__':
    main()
