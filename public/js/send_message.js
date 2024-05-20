//Include jquery

$(document).ready(function () {

    // Send message
    $('#send_message').click(function () {
        var message = $('#message').val();
        var report_id = $('#report_id').data("id");

        if (report_id == null || report_id == "") {
            alert("Report ID could not be found");
            return;
        }
        if (message == null || message == "") {
            alert("Message could not be found");
            return;
        }
        console.log(`Sending message ${message} for report ${report_id}`)
        if (message != '') {
            $.ajax({
                url: 'send_message',
                type: 'post',
                data: { message: message, id: report_id },
                success: function (response) {
                    $('#message').val('');
                },
                error: function (response) {
                    console.log(response);
                    alert(`There was an error while sending message "${response.responseText}"`);
                }
            });
        }
    });

    // Display chat
    function displayChat() {
        var report_id = $('#report_id').data("id");

        console.log(`Sending request for report ${report_id}`)
        $.ajax({
            url: 'report_messages',
            type: 'post',
            data: { id: report_id },
            success: function (response) {
                console.log(`Success`);
                console.log(response);

                $('#chat').html(response);
            },
            error: function (response) {
                console.log(`Error`);
                console.log(response);

            }
        });
    }

    // Display chat in every 1000ms
    setInterval(displayChat, 1000);

});