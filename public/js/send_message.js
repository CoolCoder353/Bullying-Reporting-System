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

    var messages_displayed = [];

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

                if (messages_displayed.length != response.length) {
                    response.forEach(function (message) {
                        if (!messages_displayed.includes(message.message_id)) {
                            messages_displayed.push(message.message_id);
                            var message = `
                            <li class="list-group-item" style="margin-bottom:6px;">
                            <div class="d-flex media">
                                <div class="media-body">
                                    <div class="d-flex media" style="overflow:visible;">
                                        <div  style="overflow:visible;" class="media-body">

                                  <div class="row">
                            <div class="col-md-12">
                                <p><a href="#">
                                        ${message.lastname},${message.firstname}
                                    </a><br>
                                    ${message.message}<br>
                                        <small class="text-muted">
                                            ${message.datetime}
                                        </small>
                                </p>
                            </div>      </div>
                            </div>
                        </div>
                    </div>

                </li>`;
                            $('#message_parent').append(message);
                        }
                    });
                }


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