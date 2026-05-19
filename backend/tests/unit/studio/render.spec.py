import pytest
from unittest.mock import patch, MagicMock
from src.modules.processing.tasks import render_session

def test_ffmpeg_complex_filter_generation():
    task_id = "test_task"
    file_id = "test_file"
    track_configs = [
        {"s3_key": "track1.flac", "trim_start_ms": 1000, "start_offset_ms": 500, "volume": 0.8},
        {"s3_key": "track2.flac", "trim_start_ms": 0, "start_offset_ms": 0, "volume": 1.2, "trim_end_ms": 5000}
    ]

    with patch("src.modules.processing.tasks.download_file"), \
         patch("src.modules.processing.tasks.upload_file"), \
         patch("src.modules.processing.tasks._send_webhook"), \
         patch("src.modules.processing.tasks.Path.stat", return_value=MagicMock(st_size=1024)), \
         patch("ffmpeg.input") as mock_input, \
         patch("ffmpeg.filter") as mock_filter, \
         patch("ffmpeg.output") as mock_output:
        
        mock_stream = MagicMock()
        mock_input.return_value = mock_stream
        mock_stream.filter.return_value = mock_stream

        mock_merged = MagicMock()
        mock_filter.return_value = mock_merged
        
        mock_out_node = MagicMock()
        mock_output.return_value = mock_out_node
        mock_out_node.overwrite_output.return_value.run.return_value = (b"", b"")

        render_session(task_id, track_configs, file_id)

        assert mock_input.call_count == 2
        
        calls = mock_stream.filter.call_args_list
        filter_names = [call[0][0] for call in calls]
        
        assert 'atrim' in filter_names
        assert 'adelay' in filter_names
        assert 'volume' in filter_names
        
        mock_filter.assert_called_with(mock_input.call_args_list, 'amix', inputs=2, duration='longest')